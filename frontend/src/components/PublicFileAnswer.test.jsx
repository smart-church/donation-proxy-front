import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import PublicFileAnswer from './PublicFileAnswer';
import * as api from '../mock/api';
jest.mock('../mock/api', () => ({ uploadAnswerFile: jest.fn(), removeAnswerFile: jest.fn() }));
const field = { id: 3, title: 'Документ', file_limits: { allowed_extensions: ['pdf', 'doc', 'docx'], max_files: 2, max_file_bytes: 100, max_total_bytes: 200 } };
let root, container, files;
const busy = jest.fn(), session = jest.fn();
function Harness({ enabled = true }) {
  const [value, setValue] = useState([]); files = value;
  return <PublicFileAnswer eventId='1' field={field} files={value} onChange={setValue} getSession={session} onBusyChange={busy} enabled={enabled} />;
}
beforeEach(() => { global.IS_REACT_ACT_ENVIRONMENT = true; jest.resetAllMocks(); session.mockResolvedValue('secret'); container = document.createElement('div'); root = createRoot(container); });
afterEach(() => act(() => root.unmount()));
const choose = (items) => act(async () => Simulate.change(container.querySelector('input'), { target: { files: items, value: '' } }));
test('uploads a file, reports busy and deletes it through the same session', async () => {
  let resolve;
  api.uploadAnswerFile.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  api.removeAnswerFile.mockResolvedValue({});
  await act(async () => root.render(<Harness />));
  await choose([new File(['pdf'], 'a.pdf')]);
  expect(busy).toHaveBeenLastCalledWith(true);
  expect(container.querySelector('input').disabled).toBe(true);
  await act(async () => resolve({ file_id: 'id', name: 'a.pdf', size: 3 }));
  expect(files).toHaveLength(1); expect(busy).toHaveBeenLastCalledWith(false);
  await act(async () => Simulate.click([...container.querySelectorAll('button')].find((b) => b.textContent === 'Убрать')));
  expect(api.removeAnswerFile).toHaveBeenCalledWith('1', 'id', 'secret', expect.anything());
  expect(files).toHaveLength(0);
});
test('partial failure retries only the unsuccessful file', async () => {
  api.uploadAnswerFile.mockResolvedValueOnce({ file_id: 'one', name: 'a.pdf', size: 3 })
    .mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ file_id: 'two', name: 'b.pdf', size: 3 });
  await act(async () => root.render(<Harness />));
  await choose([new File(['pdf'], 'a.pdf'), new File(['pdf'], 'b.pdf')]);
  await act(async () => Simulate.click([...container.querySelectorAll('button')].find((b) => b.textContent === 'Повторить загрузку')));
  expect(api.uploadAnswerFile.mock.calls.map((args) => args[3].name)).toEqual(['a.pdf', 'b.pdf', 'b.pdf']);
  expect(files).toHaveLength(2);
});
test('disabled uploads and invalid files never call API', async () => {
  await act(async () => root.render(<Harness enabled={false} />));
  expect(container.querySelector('input').disabled).toBe(true);
  await choose([new File(['pdf'], 'a.pdf')]); expect(api.uploadAnswerFile).not.toHaveBeenCalled();
  await act(async () => root.render(<Harness />));
  await choose([new File(['exe'], 'a.exe')]); expect(api.uploadAnswerFile).not.toHaveBeenCalled();
  expect(container.textContent).toContain('формат');
});

test('cancelling while the session opens preserves files for retry', async () => {
  let resolveSession;
  session.mockImplementationOnce(() => new Promise((resolve) => { resolveSession = resolve; }));
  api.uploadAnswerFile.mockResolvedValue({ file_id: 'one', name: 'a.pdf', size: 3 });
  await act(async () => root.render(<Harness />));
  await choose([new File(['pdf'], 'a.pdf')]);
  await act(async () => Simulate.click([...container.querySelectorAll('button')].find((b) => b.textContent === 'Отменить')));
  await act(async () => resolveSession('secret'));
  expect(api.uploadAnswerFile).not.toHaveBeenCalled();
  expect(container.textContent).toContain('Загрузка отменена.');
  expect(busy).toHaveBeenLastCalledWith(false);
  await act(async () => Simulate.click([...container.querySelectorAll('button')].find((b) => b.textContent === 'Повторить загрузку')));
  expect(files).toHaveLength(1);
});
