import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import FormEdit from './FormEdit';

const agreement = { id: 3, type: 'agreement', title: 'Согласие на обработку персональных данных',
  description: 'Выражаю согласие на обработку персональных данных', required: true,
  options: ['Подтверждаю'], resources: [] };
const mockPatch = jest.fn();
let mockSaveStatus = "idle";
jest.mock('react-router-dom', () => ({ useParams: () => ({ eventId: '7' }) }));
jest.mock('../components/AppContext', () => ({ useApp: () => ({ notify: jest.fn() }) }));
jest.mock('../hooks/useEditableForm', () => () => ({
  form: { fields: [agreement] }, loading: false, fieldErrors: {}, patchLocal: mockPatch, saveStatus: mockSaveStatus,
}));
jest.mock('../mock/api', () => ({ downloadAgreement: jest.fn() }));

test('system agreement has a fixed preview and document without editable controls or deletion', () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(<FormEdit />));
  expect(container.textContent).toContain(agreement.description);
  expect(container.textContent).toContain('Согласие на обработку персональных данных.pdf');
  expect(container.querySelector('[type=checkbox]').disabled).toBe(true);
  expect(container.querySelector('[data-testid=field-remove-3]')).toBeNull();
  expect(container.querySelector('[data-testid=field-title-3]')).toBeNull();
  expect(container.querySelector('select')).toBeNull();
  expect(container.textContent).not.toContain('Материалы к вопросу');
  act(() => root.unmount());
});

test.each(['saving', 'error'])('agreement cannot download a stale document while form state is %s', (status) => {
  mockSaveStatus = status;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  const mounted = createRoot(container);
  act(() => mounted.render(<FormEdit />));
  const download = [...container.querySelectorAll('button')].find((button) => button.textContent.endsWith('.pdf'));
  expect(download.disabled).toBe(true);
  mockSaveStatus = 'saved';
  act(() => mounted.render(<FormEdit />));
  expect(download.disabled).toBe(false);
  act(() => { mounted.unmount(); });
  mockSaveStatus = 'idle';
});
