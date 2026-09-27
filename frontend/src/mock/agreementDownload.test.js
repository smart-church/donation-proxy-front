import axios from 'axios';
import { downloadAgreement } from './api';

jest.mock('axios', () => ({ get: jest.fn(), create: jest.fn(() => ({
  defaults: { baseURL: '' }, get: jest.fn(),
  interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
})) }));
const client = axios.create.mock.results[0].value;
let clicked;
beforeEach(() => {
  jest.clearAllMocks(); jest.useFakeTimers();
  URL.createObjectURL = jest.fn(() => 'blob:agreement');
  URL.revokeObjectURL = jest.fn();
  jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
    clicked = { href: this.href, name: this.download };
  });
});
afterEach(() => { jest.runOnlyPendingTimers(); jest.useRealTimers(); jest.restoreAllMocks(); });

test.each([true, false])('agreement is fetched as a PDF without navigating the app (public: %s)', async (publicView) => {
  const pdf = new Blob(['%PDF'], { type: 'application/pdf' });
  axios.get.mockResolvedValue({ data: pdf }); client.get.mockResolvedValue({ data: pdf });
  await downloadAgreement(7, { publicView });
  const request = publicView ? axios.get : client.get;
  expect(request).toHaveBeenCalledWith('/api/v1/events/7/agreement.pdf',
    { responseType: 'blob', headers: { Accept: 'application/pdf, application/json' } });
  expect(publicView ? client.get : axios.get).not.toHaveBeenCalled();
  expect(clicked).toEqual({ href: 'blob:agreement', name: 'Согласие на обработку персональных данных.pdf' });
  jest.runOnlyPendingTimers();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:agreement');
});

test('HTML from a fallback route is never downloaded as a PDF', async () => {
  axios.get.mockResolvedValue({ data: new Blob(['<html/>'], { type: 'text/html' }) });
  await expect(downloadAgreement(7, { publicView: true })).rejects.toThrow('Expected a PDF');
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});
