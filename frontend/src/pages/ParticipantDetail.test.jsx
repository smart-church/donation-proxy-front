import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import ParticipantDetail from './ParticipantDetail';
import * as api from '../mock/api';
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useParams: () => ({ id: '1' }), useSearchParams: () => [new URLSearchParams('event=2')], useNavigate: () => mockNavigate }));
jest.mock('../components/AppContext', () => ({ useApp: () => ({ notify: jest.fn() }) }));
jest.mock('../mock/api', () => ({ getParticipant: jest.fn(), getForm: jest.fn(), checkParticipantDonation: jest.fn() }));
let root, container;
const donation = { status: 'pending', label: 'Ожидается пожертвование', amount: '10.00', donation_url: '/donation-link/registration-id' };
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.resetAllMocks();
  api.getParticipant.mockResolvedValue({ id: 1, full_name: 'Donor', email: 'donor@example.test', status: 'pending', answers: {}, donation });
  api.getForm.mockResolvedValue({ fields: [] });
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });
const mount = () => act(async () => root.render(<ParticipantDetail />));
const checkButton = () => [...container.querySelectorAll('button')].find((button) => button.textContent === 'Проверить поступление');

test('organizer sees donation status and can fetch bank-confirmed receipt', async () => {
  api.checkParticipantDonation.mockResolvedValue({ donation: { ...donation, status: 'paid', label: 'Пожертвование получено', paid_amount: '10.00', paid_at: '2026-10-29T12:00:00Z' } });
  await mount();
  expect(container.querySelector('[data-testid="participant-donation"]').textContent).toContain('Ожидается пожертвование');
  await act(async () => Simulate.click(checkButton()));
  expect(api.checkParticipantDonation).toHaveBeenCalledWith('2', '1');
  expect(container.querySelector('[data-testid="participant-donation"]').textContent).toContain('Пожертвование получено');
  expect(container.textContent).toContain('Дата поступления');
});

test('zero amount hides the donation card and its check button', async () => {
  api.getParticipant.mockResolvedValue({ id: 1, full_name: 'Free', status: 'pending', answers: {}, donation: null });
  await mount();
  expect(container.querySelector('[data-testid="participant-donation"]')).toBeNull();
  expect(checkButton()).toBeUndefined();
});

test('check failure preserves the previous status and explains the failure', async () => {
  api.checkParticipantDonation.mockRejectedValue({ message_ru: 'ВТБ временно недоступен' });
  await mount();
  await act(async () => Simulate.click(checkButton()));
  expect(container.querySelector('[data-testid="participant-donation"]').textContent).toContain('Ожидается пожертвование');
  expect(container.querySelector('[role="alert"]').textContent).toContain('ВТБ временно недоступен');
});
