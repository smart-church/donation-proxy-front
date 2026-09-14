import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { PublicForm } from './PublicForm';
import * as api from '../mock/api';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useParams: () => ({ id: '1' }), useNavigate: () => mockNavigate }));
jest.mock('../mock/api', () => ({ getPublicForm: jest.fn(), createFormUploadSession: jest.fn(),
  uploadAnswerFile: jest.fn(), removeAnswerFile: jest.fn(), submitParticipant: jest.fn() }));
const policy = { allowed_extensions: ['pdf'], max_files: 2, max_file_bytes: 100, max_total_bytes: 200 };
const fields = [
  { id: 1, type: 'email', title: 'Email', required: true },
  { id: 2, type: 'file', title: 'Заявление', required: true, file_limits: policy },
  { id: 3, type: 'file', title: 'Дополнение', required: false, file_limits: policy },
];
let root, container;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.resetAllMocks();
  api.getPublicForm.mockResolvedValue({ event: { name: 'Event', registration_open: true, public_upload_enabled: true }, fields });
  api.createFormUploadSession.mockResolvedValue({ token: 'secret' });
  api.submitParticipant.mockResolvedValue({});
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });
const mount = () => act(async () => root.render(<PublicForm />));
const button = () => container.querySelector('[type=submit]');
const submit = () => act(async () => Simulate.submit(container.querySelector('form')));
const choose = (index, name) => act(async () => Simulate.change(container.querySelectorAll('[type=file]')[index],
  { target: { files: [new File(['pdf'], name)], value: '' } }));
const email = (value) => act(async () => Simulate.change(container.querySelector('[type=email]'), { target: { value } }));

test('shared session, pending uploads and text validation preserve the complete file submission', async () => {
  await mount();
  await email('invalid');
  expect(button().disabled).toBe(true); // required file is still missing
  let resolveUpload;
  api.uploadAnswerFile.mockImplementationOnce(() => new Promise((resolve) => { resolveUpload = resolve; }));
  await choose(0, 'answer.pdf');
  await submit();
  expect(api.submitParticipant).not.toHaveBeenCalled();
  await act(async () => resolveUpload({ file_id: 'one', name: 'answer.pdf', size: 3 }));
  expect(button().disabled).toBe(false);
  api.uploadAnswerFile.mockResolvedValueOnce({ file_id: 'two', name: 'extra.pdf', size: 3 });
  await choose(1, 'extra.pdf');
  expect(api.createFormUploadSession).toHaveBeenCalledTimes(1);
  api.submitParticipant.mockRejectedValueOnce({ message_ru: 'Некорректный email.' });
  await submit();
  expect(container.textContent).toContain('Некорректный email.');
  expect(container.textContent).toContain('answer.pdf');
  expect(container.textContent).toContain('extra.pdf');
  await email('participant@example.com');
  let resolveSubmit;
  api.submitParticipant.mockImplementationOnce(() => new Promise((resolve) => { resolveSubmit = resolve; }));
  await submit();
  expect(button().disabled).toBe(true);
  expect([...container.querySelectorAll('[type=file]')].every((input) => input.disabled)).toBe(true);
  await submit();
  expect(api.submitParticipant).toHaveBeenCalledTimes(2);
  expect(api.submitParticipant).toHaveBeenLastCalledWith('1', expect.objectContaining({
    1: 'participant@example.com', 2: [expect.objectContaining({ file_id: 'one' })], 3: [expect.objectContaining({ file_id: 'two' })],
  }), fields, {}, 'secret');
  await act(async () => resolveSubmit({}));
  expect(mockNavigate).toHaveBeenCalledWith('/form/1/success');
});

test('legacy form without files submits without an upload session', async () => {
  api.getPublicForm.mockResolvedValue({ event: { name: 'Event', registration_open: true }, fields: [fields[0]] });
  await mount(); await email('participant@example.com'); await submit();
  expect(api.createFormUploadSession).not.toHaveBeenCalled();
  expect(api.submitParticipant).toHaveBeenCalledWith('1', { 1: 'participant@example.com' }, [fields[0]], {}, undefined);
});
