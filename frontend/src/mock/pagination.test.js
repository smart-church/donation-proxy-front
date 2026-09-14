import axios from 'axios';
import { listParticipants, listMail, createParticipant } from './api';

jest.mock('axios', () => ({ create: jest.fn(() => ({
  get: jest.fn(), post: jest.fn(),
  interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
})) }));
const client = axios.create.mock.results[0].value;
const participant = (id) => ({ id, full_name: `Participant ${id}`, email: `p${id}@example.com`, status: 'New',
  file_answers: [{ field_id: 3, files: [{ name: `answer-${id}.pdf` }] }] });
const mail = (id) => ({ id, receiver: `p${id}@example.com`, subject: `Mail ${id}` });
const cases = [
  ['participants', listParticipants, 'participants', participant],
  ['mail', listMail, 'mails', mail],
];
beforeEach(() => client.get.mockReset());
function pages(path, key, rows) {
  client.get.mockImplementation((url, options) => {
    if (url.endsWith('/form')) return Promise.resolve({ data: { fields: [{ id: 3, type: 'file', title: 'Документ' }] } });
    expect(url).toBe(`/api/v1/events/7/${path}`);
    const { page, page_size: size } = options.params;
    return Promise.resolve({ data: { [key]: rows.slice((page - 1) * size, page * size) } });
  });
}

test.each(cases)('%s loads three pages and retains records beyond 100', async (path, load, key, make) => {
  const rows = Array.from({ length: 205 }, (_, i) => make(i + 1));
  pages(path, key, rows);
  const loaded = await load(7);
  expect(loaded.map((row) => row.id)).toEqual(rows.map((row) => row.id));
  expect(client.get.mock.calls.filter(([url]) => !url.endsWith('/form')).map(([, options]) => options.params))
    .toEqual([1, 2, 3].map((page) => ({ page, page_size: 100 })));
  if (path === 'participants') expect(loaded[204].answers[3]).toEqual(['answer-205.pdf']);
  else expect(loaded[204].recipients).toEqual(['p205@example.com']);
});

test.each(cases)('%s stops on an empty page after an exact page boundary', async (path, load, key, make) => {
  pages(path, key, Array.from({ length: 100 }, (_, i) => make(i + 1)));
  expect(await load(7)).toHaveLength(100);
  expect(client.get.mock.calls.filter(([url]) => !url.endsWith('/form'))).toHaveLength(2);
});

test.each(cases)('%s does not return a partial list if a later page fails', async (path, load, key, make) => {
  client.get.mockImplementation((url, options) => {
    if (url.endsWith('/form')) return Promise.resolve({ data: { fields: [] } });
    if (options.params.page === 1) return Promise.resolve({ data: { [key]: Array.from({ length: 100 }, (_, i) => make(i + 1)) } });
    return Promise.reject(new Error('network'));
  });
  await expect(load(7)).rejects.toThrow('network');
});

test('mail page overlap does not duplicate records', async () => {
  client.get.mockResolvedValueOnce({ data: { mails: Array.from({ length: 100 }, (_, i) => mail(101 - i)) } })
    .mockResolvedValueOnce({ data: { mails: [mail(2), mail(1)] } });
  const loaded = await listMail(7);
  expect(loaded).toHaveLength(101);
  expect(loaded.map((item) => item.id)).toEqual(Array.from({ length: 101 }, (_, i) => 101 - i));
});

test('manual participant creation uses the management endpoint and maps the returned status', async () => {
  client.post.mockResolvedValueOnce({ data: { id: 9, reg_id: 'registration-id', full_name: 'Иван', email: 'ivan@example.com', status: 'New', fields: [], file_answers: [] } });
  const payload = { full_name: 'Иван', email: 'ivan@example.com' };
  const created = await createParticipant(7, payload, [{ id: 1, type: 'full_name' }, { id: 2, type: 'email' }]);
  expect(client.post).toHaveBeenCalledWith('/api/v1/events/7/participants', payload);
  expect(created.status).toBe('pending');
  expect(created.answers).toEqual({ 1: 'Иван', 2: 'ivan@example.com' });
});
