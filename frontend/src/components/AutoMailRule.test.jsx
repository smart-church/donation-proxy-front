import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import AutoMailRule from './AutoMailRule';
let root, container, latest;
const fields = [{ id: 1, title: 'Format', type: 'radio', options: ['Online', 'Offline'] },
  { id: 2, title: 'Second radio', type: 'radio', options: ['Support'] },
  { id: 4, title: 'Donation', type: 'donation-radio', options: [{ name: 'Donate', amount: 100 }] },
  { id: 5, title: 'Multiple', type: 'checkbox', options: ['A', 'B'] },
  { id: 3, title: 'Name', type: 'text' }];
function Harness({ disabled = false, error }) {
  const [rule, setRule] = useState(null); latest = rule;
  return <AutoMailRule fields={fields} templates={[{ id: 5, name: 'Welcome' }]} rule={rule}
    disabled={disabled} error={error} onChange={setRule} />;
}
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div'); root = createRoot(container);
  act(() => root.render(<Harness />));
});
afterEach(() => act(() => root.unmount()));
const choose = (name, value) => act(() => Simulate.change(container.querySelector(`[aria-label="${name}"]`), { target: { value } }));
test('adds exactly one rule, changes choices and removes it', () => {
  act(() => Simulate.click(container.querySelector('button')));
  expect(container.textContent).not.toContain('Добавить правило');
  expect(container.querySelector('[aria-label="Вопрос правила"]').textContent).not.toContain('Name');
  expect(container.querySelector('[aria-label="Вопрос правила"]').textContent).not.toContain('Donation');
  expect(container.querySelector('[aria-label="Вопрос правила"]').textContent).not.toContain('Multiple');
  choose('Вопрос правила', '1');
  expect(container.querySelectorAll('[aria-label^="Шаблон для ответа:"]')).toHaveLength(2);
  expect(latest.answers).toEqual([{ option: 'Online', template_id: null }, { option: 'Offline', template_id: null }]);
  choose('Шаблон для ответа: Online', '5');
  choose('Шаблон для ответа: Offline', '5');
  expect(latest).toEqual({ question_id: 1, other_template_id: null, answers: [{ option: 'Online', template_id: 5 }, { option: 'Offline', template_id: 5 }] });
  choose('Шаблон для ответа: Online', '');
  expect(latest.answers[0].template_id).toBeNull();
  expect(latest.answers[1].template_id).toBe(5);
  choose('Вопрос правила', '2');
  expect(latest.answers).toEqual([{ option: 'Support', template_id: null }]);
  expect(container.querySelector('[aria-label="Шаблон для ответа: Support"]')).not.toBeNull();
  act(() => Simulate.click(container.querySelector('button')));
  expect(latest).toBeNull();
});
test('disabled mail prevents editing and server errors are visible', () => {
  act(() => root.render(<Harness disabled error="Выберите шаблон этого мероприятия." />));
  expect(container.querySelector('button').disabled).toBe(true);
  expect(container.querySelector('[role=alert]').textContent).toContain('Выберите шаблон');
});

test('legacy unsupported rule can be removed or replaced with radio', () => {
  const change = jest.fn();
  act(() => root.render(<AutoMailRule fields={fields} templates={[]} rule={{ question_id: 5, answers: [] }} onChange={change} />));
  expect(container.querySelector('[role=alert]').textContent).toContain('не поддерживается');
  act(() => Simulate.click(container.querySelector('button')));
  expect(change).toHaveBeenCalledWith(null);
  choose('Вопрос правила', '1');
  expect(change).toHaveBeenLastCalledWith({ question_id: 1, other_template_id: null, answers: [{ option: 'Online', template_id: null }, { option: 'Offline', template_id: null }] });
});

test('Other template is shown only for enabled custom choice and stored separately', () => {
  const change = jest.fn();
  const rule = { question_id: 1, answers: [{ option: 'Online', template_id: 5 }] };
  const props = { fields, templates: [{ id: 5, name: 'Welcome' }], rule, onChange: change };
  act(() => root.render(<AutoMailRule {...props} />));
  expect(container.querySelector('[aria-label="Шаблон для ответа Другое (свой вариант)"]')).toBeNull();
  act(() => root.render(<AutoMailRule {...props} fields={fields.map((field) => ({ ...field, allow_other: true }))} />));
  choose('Шаблон для ответа Другое (свой вариант)', '5');
  expect(change).toHaveBeenLastCalledWith({ ...rule, other_template_id: 5 });
  choose('Шаблон для ответа Другое (свой вариант)', '');
  expect(change).toHaveBeenLastCalledWith({ ...rule, other_template_id: null });
});
