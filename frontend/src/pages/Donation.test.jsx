import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import Donation from './Donation';
import * as api from '../mock/api';
import { redirectToNspk } from '../lib/donationNavigation';
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useParams: () => ({ regId: 'registration-id' }), useNavigate: () => mockNavigate }));
jest.mock('../mock/api', () => ({ getDonation: jest.fn() }));
jest.mock('../lib/donationNavigation', () => ({ redirectToNspk: jest.fn() }));
let root, container;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.resetAllMocks(); jest.useFakeTimers();
  container = document.createElement('div'); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); jest.useRealTimers(); });
const mount = (resultOnly = false) => act(async () => root.render(<Donation resultOnly={resultOnly} />));

test('personal link opens a ready NSPK URL without an additional click', async () => {
  api.getDonation.mockResolvedValue({ status: 'pending', payment_url: 'https://qr.nspk.ru/QR123' });
  await mount();
  expect(redirectToNspk).toHaveBeenCalledWith('https://qr.nspk.ru/QR123');
  expect(api.getDonation).toHaveBeenCalledWith('registration-id', false);
});

test('received donation redirects to success without opening NSPK', async () => {
  api.getDonation.mockResolvedValue({ status: 'paid', success_url: '/form/1/success' });
  await mount();
  expect(mockNavigate).toHaveBeenCalledWith('/form/1/success', { replace: true });
  expect(redirectToNspk).not.toHaveBeenCalled();
});

test('unknown creation result does not automatically repeat checkout', async () => {
  api.getDonation.mockResolvedValue({ status: 'creation_unknown' });
  await mount();
  await act(async () => jest.advanceTimersByTime(60000));
  expect(api.getDonation).toHaveBeenCalledTimes(1);
  expect(container.textContent).toContain('Поступление уточняется');
  expect(redirectToNspk).not.toHaveBeenCalled();
});

test('return from bank checks status without creating or reopening a QR', async () => {
  api.getDonation.mockResolvedValue({ status: 'pending', payment_url: 'https://qr.nspk.ru/QR123' });
  await mount(true);
  await act(async () => jest.advanceTimersByTime(6000));
  expect(api.getDonation).toHaveBeenLastCalledWith('registration-id', true);
  expect(redirectToNspk).not.toHaveBeenCalled();
});

test('missing server credentials show a recoverable message', async () => {
  api.getDonation.mockResolvedValue({ status: 'pending', code: 'VTB_NOT_CONFIGURED' });
  await mount();
  expect(container.textContent).toContain('пока не настроена');
  await act(async () => Simulate.click(container.querySelector('button')));
  expect(api.getDonation).toHaveBeenCalledTimes(2);
});
