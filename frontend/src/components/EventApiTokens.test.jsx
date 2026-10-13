import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import EventApiTokens from './EventApiTokens';
import * as api from '../mock/api';

jest.mock('../mock/api', () => ({ listEventApiTokens: jest.fn(), createEventApiToken: jest.fn(), revokeEventApiToken: jest.fn() }));
let root, container;
const token = { id: 5, name: 'Bot', prefix: 'dp_public', expires_at: '2030-12-31T12:00:00Z', status: 'active', revoked_at: null };
const secret = 'dp_public.secret-for-one-time-display';
const change = (testid, value) => act(() => Simulate.change(container.querySelector(`[data-testid=${testid}]`), { target: { value } }));
const submit = async () => act(async () => Simulate.submit(container.querySelector('form')));
const click = async (testid) => act(async () => Simulate.click(container.querySelector(`[data-testid=${testid}]`)));

beforeEach(async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.useFakeTimers(); jest.setSystemTime(new Date('2030-01-01T10:00:00Z')); jest.clearAllMocks();
  api.listEventApiTokens.mockResolvedValue([]);
  api.createEventApiToken.mockResolvedValue({ token, secret });
  api.revokeEventApiToken.mockResolvedValue({ ok: true });
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: jest.fn().mockResolvedValue() } });
  container = document.createElement('div'); root = createRoot(container);
  await act(async () => root.render(<EventApiTokens key="4" eventId="4" />));
});
afterEach(async () => { await act(async () => root.unmount()); jest.useRealTimers(); });

test('creates an event-scoped token with ISO expiry and shows secret only once', async () => {
  change('api-token-name', ' Telegram bot ');
  change('api-token-expires', '10/10/2030');
  await submit();
  expect(api.createEventApiToken).toHaveBeenCalledWith('4', { name: 'Telegram bot', expires_at: new Date(2030, 9, 10).toISOString() });
  expect(container.querySelector('[data-testid=api-token-secret]').value).toBe(secret);
  expect(container.querySelector('[data-testid=api-token-row-5]').textContent).not.toContain(secret);
  const copy = [...container.querySelectorAll('button')].find((b) => b.textContent.includes('Скопировать'));
  await act(async () => Simulate.click(copy));
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith(secret);
  await click('api-token-secret-modal-close');
  expect(container.querySelector('[data-testid=api-token-secret]')).toBeNull();
  expect(container.textContent).not.toContain(secret);
  expect(localStorage.getItem('DONATION_API_TOKEN')).toBeNull();
});

test('rejects blank names and missing or past expiry', async () => {
  await submit();
  expect(container.textContent).toContain('Введите название токена');
  change('api-token-name', 'Bot');
  for (const expiry of ['', '31/12/2029']) {
    change('api-token-expires', expiry); await submit();
    expect(container.querySelector('[data-testid=api-token-expires]').getAttribute('aria-invalid')).toBe('true');
  }
  expect(api.createEventApiToken).not.toHaveBeenCalled();
});

test('shows backend validation error without losing input', async () => {
  api.createEventApiToken.mockRejectedValue({ field_errors: { expires_at: 'Срок действия должен быть в будущем.' }, message_ru: 'Проверьте данные.' });
  change('api-token-name', 'Bot'); change('api-token-expires', '10/10/2030');
  await submit();
  expect(container.textContent).toContain('Срок действия должен быть в будущем.');
  expect(container.querySelector('[data-testid=api-token-name]').value).toBe('Bot');
  expect(container.querySelector('[data-testid=api-token-secret]')).toBeNull();
});

test('list failure offers retry and prevents accidental issuance', async () => {
  api.listEventApiTokens.mockRejectedValueOnce({ message_ru: 'Нет доступа' });
  await act(async () => root.render(<EventApiTokens key="6" eventId="6" />));
  expect(container.textContent).toContain('Нет доступа');
  expect(container.querySelector('[data-testid=api-token-create]').disabled).toBe(true);
  const retry = [...container.querySelectorAll('button')].find((b) => b.textContent === 'Повторить');
  await act(async () => Simulate.click(retry));
  expect(container.textContent).not.toContain('Нет доступа');
  expect(container.querySelector('[data-testid=api-token-create]').disabled).toBe(false);
});

test('confirms revocation and updates token status', async () => {
  api.listEventApiTokens.mockResolvedValue([token]);
  await act(async () => root.render(<EventApiTokens key="5" eventId="5" />));
  await act(async () => Simulate.click(container.querySelector('[aria-label="Отозвать токен Bot"]')));
  expect(api.revokeEventApiToken).not.toHaveBeenCalled();
  await click('api-token-revoke-confirm');
  expect(api.revokeEventApiToken).toHaveBeenCalledWith('5', 5);
  expect(container.querySelector('[data-testid=api-token-row-5]').textContent).toContain('Отозван');
  expect(container.querySelector('[aria-label="Отозвать токен Bot"]')).toBeNull();
});

test('failed revocation keeps the token active and displays error', async () => {
  api.listEventApiTokens.mockResolvedValue([token]);
  api.revokeEventApiToken.mockRejectedValue({ message_ru: 'Недостаточно прав' });
  await act(async () => root.render(<EventApiTokens key="5" eventId="5" />));
  await act(async () => Simulate.click(container.querySelector('[aria-label="Отозвать токен Bot"]')));
  await click('api-token-revoke-confirm');
  expect(container.querySelector('[data-testid=api-token-revoke-modal]').textContent).toContain('Недостаточно прав');
  expect(container.querySelector('[data-testid=api-token-row-5]').textContent).toContain('Действует');
});

test('event navigation clears the one-time secret', async () => {
  change('api-token-name', 'Bot'); change('api-token-expires', '10/10/2030'); await submit();
  await act(async () => root.render(<EventApiTokens key="8" eventId="8" />));
  expect(container.querySelector('[data-testid=api-token-secret]')).toBeNull();
  expect(api.listEventApiTokens).toHaveBeenLastCalledWith('8');
});

test('status changes to expired at the configured time', async () => {
  api.listEventApiTokens.mockResolvedValue([{ ...token, expires_at: '2030-01-01T10:00:01Z' }]);
  await act(async () => root.render(<EventApiTokens key="5" eventId="5" />));
  expect(container.querySelector('[data-testid=api-token-row-5]').textContent).toContain('Действует');
  await act(async () => jest.advanceTimersByTime(1000));
  expect(container.querySelector('[data-testid=api-token-row-5]').textContent).toContain('Истёк');
});


test('date input uses the settings numeric mask and displays dates without times', async () => {
  const input = container.querySelector('[data-testid=api-token-expires]');
  expect(input.type).toBe('text');
  expect(input.inputMode).toBe('numeric');
  expect(input.maxLength).toBe(10);
  change('api-token-expires', '');
  expect(container.querySelector('[data-testid=api-token-expires-template]').textContent).toBe('дд/мм/гггг');
  change('api-token-expires', '31');
  expect(container.querySelector('[data-testid=api-token-expires-template]').textContent).toBe('/мм/гггг');
  change('api-token-expires', '');
  for (const digit of '31122030') change('api-token-expires', input.value + digit);
  expect(input.value).toBe('31/12/2030');
  change('api-token-name', 'Bot');
  await submit();
  expect(api.createEventApiToken).toHaveBeenCalledWith('4', {
    name: 'Bot', expires_at: new Date(2030, 11, 31).toISOString(),
  });
  expect(container.querySelector('[data-testid=api-token-row-5]').textContent).toContain('31/12/2030');
  expect(container.querySelector('[data-testid=api-token-row-5]').textContent).not.toMatch(/\d{2}:\d{2}/);
  expect(container.querySelector('[data-testid=api-token-secret-modal]').textContent).not.toMatch(/\d{2}:\d{2}/);
});

test('rejects incomplete dates, impossible dates and today; accepts a leap day', async () => {
  change('api-token-name', 'Bot');
  for (const value of ['31/02/2030', '29/02/2030', '10/13/2030', '10/10/203', '01/01/2030']) {
    change('api-token-expires', value); await submit();
    expect(api.createEventApiToken).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid=api-token-expires]').getAttribute('aria-invalid')).toBe('true');
  }
  change('api-token-expires', '29022032'); await submit();
  expect(api.createEventApiToken).toHaveBeenCalledWith('4', {
    name: 'Bot', expires_at: new Date(2032, 1, 29).toISOString(),
  });
});
