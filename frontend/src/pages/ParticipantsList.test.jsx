import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import * as XLSX from 'xlsx';
import ParticipantsList from './ParticipantsList';
import * as api from '../mock/api';

jest.mock('react-router-dom', () => ({ useParams: () => ({ eventId: '7' }), useNavigate: () => jest.fn() }));
jest.mock('../mock/api', () => ({ getForm: jest.fn(), listParticipants: jest.fn(), createParticipant: jest.fn() }));
jest.mock('xlsx', () => ({ ...jest.requireActual('xlsx'), writeFile: jest.fn() }));
let root, container;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });
async function exportQuestions(titles) {
  const fields = titles.map((title, index) => ({ id: index + 7, title, type: 'file' }));
  api.getForm.mockResolvedValue({ fields });
  api.listParticipants.mockResolvedValue([{ id: 1, full_name: 'Test Person', email: 'person@example.com', status: 'pending',
    answers: Object.fromEntries(fields.map((field) => [field.id, [`answer-${field.id}.pdf`]])) }]);
  await act(async () => root.render(<ParticipantsList />));
  for (const field of fields) await act(async () => Simulate.click(container.querySelector(`[data-testid="col-toggle-${field.id}"]`)));
  await act(async () => Simulate.click(container.querySelector('[data-testid="participants-export"]')));
  const sheet = XLSX.writeFile.mock.calls[0][0].Sheets['Участники'];
  return XLSX.utils.sheet_to_json(sheet, { header: 1 });
}

test('question titles cannot overwrite built-in export columns', async () => {
  const [headers, row] = await exportQuestions(['Почта', 'Статус', 'ФИО', '#']);
  expect(headers).toEqual(['#', 'ФИО', 'Почта', 'Статус', 'Почта (#7)', 'Статус (#8)', 'ФИО (#9)', '# (#10)']);
  expect(row).toEqual([1, 'Test Person', 'person@example.com', 'На проверке', 'answer-7.pdf', 'answer-8.pdf', 'answer-9.pdf', 'answer-10.pdf']);
});

test('duplicate, generated and object-property names retain separate export columns', async () => {
  const [headers, row] = await exportQuestions(['Почта', 'Почта (#7)', 'Документ', 'Документ', '__proto__', 'constructor']);
  expect(new Set(headers).size).toBe(headers.length);
  expect(headers).toHaveLength(10);
  expect(row.slice(4)).toEqual(Array.from({ length: 6 }, (_, index) => `answer-${index + 7}.pdf`));
});

async function openCreate() {
  api.getForm.mockResolvedValue({ fields: [] });
  api.listParticipants.mockResolvedValue([]);
  await act(async () => root.render(<ParticipantsList />));
  await act(async () => Simulate.click(container.querySelector('[data-testid="participants-add"]')));
}
const input = (name) => container.querySelector(`[name="${name}"]`);
const fill = async (name, value) => act(async () => Simulate.change(input(name), { target: { value } }));
const submit = () => act(async () => Simulate.submit(container.querySelector('#participant-create-form')));

test('add opens a modal, validates input and adds the returned participant to the list', async () => {
  await openCreate();
  expect(container.querySelector('[data-testid="participant-create-modal"]')).not.toBeNull();
  await submit();
  expect(api.createParticipant).not.toHaveBeenCalled();
  expect(container.textContent).toContain('Введите ФИО.');
  await fill('full_name', '  Иван Иванов  '); await fill('email', 'ivan@example.com');
  let resolve;
  api.createParticipant.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  await submit(); await submit();
  expect(api.createParticipant).toHaveBeenCalledTimes(1);
  expect(api.createParticipant).toHaveBeenCalledWith('7', { full_name: 'Иван Иванов', email: 'ivan@example.com' }, []);
  expect(container.querySelector('[data-testid="participant-create-submit"]').disabled).toBe(true);
  await act(async () => Simulate.click(container.querySelector('[data-testid="participant-create-modal-close"]')));
  expect(container.querySelector('[data-testid="participant-create-modal"]')).not.toBeNull();
  await act(async () => resolve({ id: 42, full_name: 'Иван Иванов', email: 'ivan@example.com', status: 'pending', answers: {} }));
  expect(container.querySelector('[data-testid="participant-create-modal"]')).toBeNull();
  expect(container.querySelector('[data-testid="participant-link-42"]').textContent).toBe('Иван Иванов');
  expect(container.querySelector('[data-testid="stat-total"]').textContent).toContain('1');
});

test('failed creation keeps entered values for retry and cancel creates nothing', async () => {
  await openCreate();
  await fill('full_name', 'Иван'); await fill('email', 'ivan@example.com');
  api.createParticipant.mockRejectedValueOnce({ message_ru: 'Сервис недоступен.' });
  await submit();
  expect(container.textContent).toContain('Сервис недоступен.');
  expect(input('full_name').value).toBe('Иван');
  expect(input('email').value).toBe('ivan@example.com');
  expect(container.querySelector('[data-testid="participant-create-submit"]').disabled).toBe(false);
  await act(async () => Simulate.click(container.querySelector('[data-testid="participant-create-modal-close"]')));
  expect(container.querySelector('[data-testid="participant-create-modal"]')).toBeNull();
  expect(api.createParticipant).toHaveBeenCalledTimes(1);
});
