import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import EventSettings from './EventSettings';
import * as api from '../mock/api';
const mockNotify = jest.fn();
jest.mock('react-router-dom', () => ({ useParams: () => ({ eventId: '4' }), useNavigate: () => jest.fn() }));
jest.mock('react-quill', () => () => null);
jest.mock('../components/AppContext', () => ({ useApp: () => ({ user: { is_admin: false }, notify: mockNotify }) }));
jest.mock('../mock/api', () => ({ getEvent: jest.fn(), getForm: jest.fn(), listTemplates: jest.fn(), updateEvent: jest.fn() }));
let root, container;
beforeEach(async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true; jest.useFakeTimers(); jest.clearAllMocks();
  api.getEvent.mockResolvedValue({ name: 'Event', auto_mail_enabled: true, success_template_id: 1, registration_open: false, auto_mail_rule: null });
  api.getForm.mockResolvedValue({ fields: [{ id: 8, title: 'Format', type: 'radio', allow_other: true, options: ['Online', 'Offline'] }] });
  api.listTemplates.mockResolvedValue([{ id: 1, name: 'Default' }, { id: 2, name: 'Online letter' }]);
  api.updateEvent.mockResolvedValue({});
  container = document.createElement('div'); root = createRoot(container);
  await act(async () => root.render(<EventSettings />));
});
afterEach(async () => { await act(async () => root.unmount()); jest.useRealTimers(); });
test('settings load choices and autosave the complete rule, then remove it on navigation', async () => {
  expect(container.textContent).toContain('Шаблон письма по умолчанию');
  act(() => Simulate.click(container.querySelector('[data-testid=auto-mail-rule] button')));
  for (const [label, value] of [['Вопрос правила', '8'], ['Шаблон для ответа: Online', '2'], ['Шаблон для ответа Другое (свой вариант)', '1']]) {
    act(() => Simulate.change(container.querySelector(`[aria-label="${label}"]`), { target: { value } }));
  }
  await act(async () => jest.advanceTimersByTime(3000));
  expect(api.updateEvent).toHaveBeenCalledWith('4', expect.objectContaining({
    success_template_id: 1, auto_mail_rule: { question_id: 8, other_template_id: 1, answers: [{ option: 'Online', template_id: 2 }, { option: 'Offline', template_id: null }] },
  }));
  expect(container.textContent).toContain('Все изменения сохранены');
  act(() => Simulate.click(container.querySelector('[data-testid=auto-mail-rule] button')));
  await act(async () => root.render(null));
  expect(api.updateEvent).toHaveBeenLastCalledWith('4', expect.objectContaining({ auto_mail_rule: null }));
});
