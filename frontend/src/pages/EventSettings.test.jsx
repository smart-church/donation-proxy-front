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
  api.updateEvent.mockImplementation(async (_id, event) => { api.getEvent.mockResolvedValue({ ...event }); });
  container = document.createElement('div'); root = createRoot(container);
  await act(async () => root.render(<EventSettings />));
});
afterEach(async () => { await act(async () => root.unmount()); jest.useRealTimers(); });
test('settings save and remove rules only when Save is clicked', async () => {
  expect(container.textContent).toContain('Шаблон письма по умолчанию');
  act(() => Simulate.click(container.querySelector('[data-testid=auto-mail-rule] button')));
  for (const [label, value] of [['Вопрос правила', '8'], ['Шаблон для ответа: Online', '2'], ['Шаблон для ответа Другое (свой вариант)', '1']]) {
    act(() => Simulate.change(container.querySelector(`[aria-label="${label}"]`), { target: { value } }));
  }
  await act(async () => jest.advanceTimersByTime(3000));
  expect(api.updateEvent).not.toHaveBeenCalled();
  await act(async () => Simulate.click(container.querySelector('[data-testid=event-settings-save]')));
  expect(api.updateEvent).toHaveBeenCalledWith('4', expect.objectContaining({
    success_template_id: 1, auto_mail_rule: { question_id: 8, other_template_id: 1, answers: [{ option: 'Online', template_id: 2 }, { option: 'Offline', template_id: null }] },
  }));
  expect(mockNotify).toHaveBeenCalledWith('Параметры сохранены', 'success');
  act(() => Simulate.click(container.querySelector('[data-testid=auto-mail-rule] button')));
  await act(async () => Simulate.click(container.querySelector('[data-testid=event-settings-save]')));
  expect(api.updateEvent).toHaveBeenLastCalledWith('4', expect.objectContaining({ auto_mail_rule: null }));
});

test('schedule dates save as ISO instants and can be cleared', async () => {
  const start = container.querySelector('[data-testid=event-registration_starts_at]');
  const end = container.querySelector('[data-testid=event-registration_ends_at]');
  act(() => Simulate.change(start, { target: { value: '10/10/2030 12:00' } }));
  act(() => Simulate.change(end, { target: { value: '10/10/2030 15:00' } }));
  expect(container.querySelector('[data-testid=event-reg-open]').disabled).toBe(false);
  await act(async () => Simulate.click(container.querySelector('[data-testid=event-settings-save]')));
  expect(api.updateEvent).toHaveBeenLastCalledWith('4', expect.objectContaining({
    registration_starts_at: new Date('2030-10-10T12:00').toISOString(),
    registration_ends_at: new Date('2030-10-10T15:00').toISOString(),
  }));
  act(() => Simulate.change(start, { target: { value: '' } }));
  act(() => Simulate.change(end, { target: { value: '' } }));
  await act(async () => Simulate.click(container.querySelector('[data-testid=event-settings-save]')));
  expect(api.updateEvent).toHaveBeenLastCalledWith('4', expect.objectContaining({ registration_starts_at: null, registration_ends_at: null }));
});

test('end must be later than start', async () => {
  act(() => Simulate.change(container.querySelector('[data-testid=event-registration_starts_at]'), { target: { value: '10/10/2030 12:00' } }));
  act(() => Simulate.change(container.querySelector('[data-testid=event-registration_ends_at]'), { target: { value: '10/10/2030 12:00' } }));
  await act(async () => Simulate.click(container.querySelector('[data-testid=event-settings-save]')));
  expect(api.updateEvent).not.toHaveBeenCalled();
  expect(container.textContent).toContain('Окончание регистрации должно быть позже начала.');
});

test('clock updates scheduled checkbox and keeps approval warning', async () => {
  jest.setSystemTime(new Date('2030-10-10T11:59:59'));
  act(() => Simulate.change(container.querySelector('[data-testid=event-registration_starts_at]'), { target: { value: '10/10/2030 12:00' } }));
  act(() => Simulate.change(container.querySelector('[data-testid=event-registration_ends_at]'), { target: { value: '10/10/2030 12:01' } }));
  await act(async () => jest.advanceTimersByTime(1000));
  expect(container.querySelector('[data-testid=event-reg-open]').checked).toBe(true);
  expect(container.querySelector('[data-testid=event-approval-required-warning]')).not.toBeNull();
  await act(async () => jest.advanceTimersByTime(60000));
  expect(container.querySelector('[data-testid=event-reg-open]').checked).toBe(false);
});

test('invalid dates and times cannot be saved', async () => {
  for (const value of ['31/02/2030 12:00', '10/10/2030 24:00', '10/10/2030 12:60', '10/10/2030']) {
    act(() => Simulate.change(container.querySelector('[data-testid=event-registration_starts_at]'), { target: { value } }));
    await act(async () => Simulate.click(container.querySelector('[data-testid=event-settings-save]')));
    expect(api.updateEvent).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Введите дату и время в формате');
  }
});

test('saved values display as day/month/year and 24-hour time', async () => {
  api.getEvent.mockResolvedValue({ name: 'Event', registration_starts_at: new Date('2030-12-31T23:05').toISOString() });
  await act(async () => { root.unmount(); root = createRoot(container); root.render(<EventSettings />); });
  const input = container.querySelector('[data-testid=event-registration_starts_at]');
  expect(input.value).toBe('31/12/2030 23:05');
  act(() => Simulate.change(input, { target: { value: '01/01/2031 00:00' } }));
  await act(async () => Simulate.click(container.querySelector('[data-testid=event-settings-save]')));
  expect(api.updateEvent).toHaveBeenCalledWith('4', expect.objectContaining({ registration_starts_at: new Date('2031-01-01T00:00').toISOString() }));
});

test('typing only digits inserts date and time separators for both fields', async () => {
  for (const key of ['registration_starts_at', 'registration_ends_at']) {
    const input = container.querySelector(`[data-testid=event-${key}]`);
    expect(input.inputMode).toBe('numeric');
    for (const digit of '311220302305') {
      act(() => Simulate.change(input, { target: { value: input.value + digit } }));
    }
    expect(input.value).toBe('31/12/2030 23:05');
    act(() => Simulate.change(input, { target: { value: input.value.slice(0, -1) } }));
    expect(input.value).toBe('31/12/2030 23:0');
    act(() => Simulate.change(input, { target: { value: '' } }));
    expect(input.value).toBe('');
  }
  act(() => Simulate.change(container.querySelector('[data-testid=event-registration_starts_at]'), { target: { value: '311220302305' } }));
  await act(async () => Simulate.click(container.querySelector('[data-testid=event-settings-save]')));
  expect(api.updateEvent).toHaveBeenCalledWith('4', expect.objectContaining({ registration_starts_at: new Date('2030-12-31T23:05').toISOString() }));
});

test('remaining date template stays visible while entering and deleting digits', () => {
  expect(container.textContent).not.toContain('Вводите только цифры');
  for (const key of ['registration_starts_at', 'registration_ends_at']) {
    const input = container.querySelector(`[data-testid=event-${key}]`);
    const template = container.querySelector(`[data-testid=event-${key}-template]`);
    expect(template.textContent).toBe('дд/мм/гггг чч:мм');
    for (const [value, remaining] of [['3', 'д/мм/гггг чч:мм'], ['31', '/мм/гггг чч:мм'], ['31122030', ' чч:мм'], ['311220302305', ''], ['', 'дд/мм/гггг чч:мм']]) {
      act(() => Simulate.change(input, { target: { value } }));
      expect(template.textContent).toBe(remaining);
    }
  }
});

test('registration can be opened manually before the scheduled start', async () => {
  jest.setSystemTime(new Date('2030-10-10T10:00'));
  act(() => Simulate.change(container.querySelector('[data-testid=event-registration_starts_at]'), { target: { value: '101020301200' } }));
  act(() => Simulate.change(container.querySelector('[data-testid=event-registration_ends_at]'), { target: { value: '101020301500' } }));
  const checkbox = container.querySelector('[data-testid=event-reg-open]');
  expect(checkbox.disabled).toBe(false);
  expect(checkbox.checked).toBe(false);
  act(() => Simulate.change(checkbox, { target: { checked: true } }));
  expect(checkbox.checked).toBe(true);
  expect(container.querySelector('[data-testid=event-approval-required-warning]')).not.toBeNull();
  await act(async () => Simulate.click(container.querySelector('[data-testid=event-settings-save]')));
  expect(api.updateEvent).toHaveBeenLastCalledWith('4', expect.objectContaining({
    registration_open: true,
    registration_starts_at: new Date('2030-10-10T12:00').toISOString(),
    registration_ends_at: new Date('2030-10-10T15:00').toISOString(),
  }));
  await act(async () => jest.advanceTimersByTime(5 * 60 * 60 * 1000));
  expect(checkbox.checked).toBe(false);
  expect(checkbox.disabled).toBe(true);
});

test('participant deletion date uses the numeric template, saves and can be cleared', async () => {
  const input = container.querySelector('[data-testid=event-participant_data_delete_at]');
  const template = container.querySelector('[data-testid=event-participant_data_delete_at-template]');
  expect(template.textContent).toBe('дд/мм/гггг чч:мм');
  act(() => Simulate.change(input, { target: { value: '311220302305' } }));
  expect(input.value).toBe('31/12/2030 23:05');
  expect(template.textContent).toBe('');
  await act(async () => Simulate.click(container.querySelector('[data-testid=event-settings-save]')));
  expect(api.updateEvent).toHaveBeenLastCalledWith('4', expect.objectContaining({
    participant_data_delete_at: new Date('2030-12-31T23:05').toISOString(),
  }));
  act(() => Simulate.change(input, { target: { value: '' } }));
  await act(async () => Simulate.click(container.querySelector('[data-testid=event-settings-save]')));
  expect(api.updateEvent).toHaveBeenLastCalledWith('4', expect.objectContaining({ participant_data_delete_at: null }));
});

test('invalid participant deletion date is rejected and server errors appear by the field', async () => {
  const input = container.querySelector('[data-testid=event-participant_data_delete_at]');
  act(() => Simulate.change(input, { target: { value: '310220301200' } }));
  await act(async () => Simulate.click(container.querySelector('[data-testid=event-settings-save]')));
  expect(api.updateEvent).not.toHaveBeenCalled();
  expect(input.getAttribute('aria-invalid')).toBe('true');
  act(() => Simulate.change(input, { target: { value: '311220301200' } }));
  api.updateEvent.mockRejectedValue({ field_errors: { participant_data_delete_at: 'Неверная дата удаления' } });
  await act(async () => Simulate.click(container.querySelector('[data-testid=event-settings-save]')));
  expect(container.textContent).toContain('Неверная дата удаления');
  expect(input.getAttribute('aria-invalid')).toBe('true');
});

test('custom agreement text is saved only with settings and can be cleared', async () => {
  const input = container.querySelector('[data-testid=event-agreement-text]');
  expect(input.value).toBe('');
  const text = 'Мои условия обработки персональных данных.\nВторая строка.';
  act(() => Simulate.change(input, { target: { value: text } }));
  expect(api.updateEvent).not.toHaveBeenCalled();
  await act(async () => Simulate.click(container.querySelector('[data-testid=event-settings-save]')));
  expect(api.updateEvent).toHaveBeenLastCalledWith('4', expect.objectContaining({ agreement_text: text }));
  expect(input.value).toBe(text);
  act(() => Simulate.change(input, { target: { value: '' } }));
  await act(async () => Simulate.click(container.querySelector('[data-testid=event-settings-save]')));
  expect(api.updateEvent).toHaveBeenLastCalledWith('4', expect.objectContaining({ agreement_text: '' }));
});

test('agreement validation errors appear next to the editor and clear on editing', async () => {
  const input = container.querySelector('[data-testid=event-agreement-text]');
  act(() => Simulate.change(input, { target: { value: 'Текст' } }));
  api.updateEvent.mockRejectedValue({ field_errors: { agreement_text: 'Ошибка текста согласия' } });
  await act(async () => Simulate.click(container.querySelector('[data-testid=event-settings-save]')));
  expect(container.textContent).toContain('Ошибка текста согласия');
  expect(input.getAttribute('aria-invalid')).toBe('true');
  act(() => Simulate.change(input, { target: { value: 'Другой текст' } }));
  expect(container.textContent).not.toContain('Ошибка текста согласия');
  expect(input.getAttribute('aria-invalid')).toBe('false');
});
