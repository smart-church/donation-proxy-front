import React from "react";

export default function AutoMailRule({ rule, fields, templates, disabled, error, onChange }) {
  const questions = fields.filter((field) => field.type === "radio");
  const question = questions.find((field) => String(field.id) === String(rule?.question_id));
  const options = (question?.options || []).map((option) => typeof option === "object" ? option.name : option);
  return (
    <div className="surface-soft p-4 space-y-3" data-testid="auto-mail-rule">
      <div className="text-sm font-semibold">Письмо в зависимости от ответа</div>
      <p className="text-xs" style={{ color: "var(--text-dim)" }}>
        При совпадении ответа отправится выбранный шаблон. Иначе — письмо по умолчанию.
        Доступны вопросы с одним вариантом ответа. Для «Другое» можно назначить отдельное письмо независимо от введённого текста.
      </p>
      {!rule ? (
        <>
          <button type="button" className="btn btn-ghost" disabled={disabled || !questions.length}
            onClick={() => onChange({ question_id: "", answers: [] })}>Добавить правило</button>
          {!questions.length && <p className="text-xs">Добавьте в анкету вопрос с одним вариантом ответа.</p>}
        </>
      ) : (
        <>
          {rule.question_id && !question && !disabled && (
            <p role="alert" className="text-sm" style={{ color: "var(--danger)" }}>
              Этот вопрос не поддерживается. Используется письмо по умолчанию. Выберите вопрос с одним вариантом ответа или удалите правило.
            </p>
          )}
          <label className="block text-sm">Вопрос
            <select className="input mt-1" aria-label="Вопрос правила" disabled={disabled} value={rule.question_id}
              onChange={(e) => {
                const selected = questions.find((field) => String(field.id) === e.target.value);
                onChange({ question_id: selected?.id || "", other_template_id: null, answers: (selected?.options || []).map((option) => ({
                  option: typeof option === "object" ? option.name : option, template_id: null,
                })) });
              }}>
              <option value="">Выберите вопрос</option>
              {questions.map((field) => <option key={field.id} value={field.id}>{field.title}</option>)}
            </select>
          </label>
          {question && <div className="space-y-3">
            {options.map((option) => (
              <label key={option} className="grid gap-2 sm:grid-cols-2 sm:items-center text-sm">
                <span className="break-words">{option}</span>
                <select className="input" aria-label={`Шаблон для ответа: ${option}`} disabled={disabled}
                  value={rule.answers?.find((answer) => answer.option === option)?.template_id || ""}
                  onChange={(e) => onChange({ ...rule, answers: options.map((name) => ({
                    option: name,
                    template_id: name === option ? Number(e.target.value) || null
                      : rule.answers?.find((answer) => answer.option === name)?.template_id || null,
                  })) })}>
                  <option value="">Письмо по умолчанию</option>
                  {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                </select>
              </label>
            ))}
            {question.allow_other && (
              <label className="grid gap-2 sm:grid-cols-2 sm:items-center text-sm">
                <span>Другое <span style={{ color: "var(--text-dim)" }}>(свой вариант)</span></span>
                <select className="input" aria-label="Шаблон для ответа Другое (свой вариант)" disabled={disabled}
                  value={rule.other_template_id || ""}
                  onChange={(e) => onChange({ ...rule, other_template_id: Number(e.target.value) || null })}>
                  <option value="">Письмо по умолчанию</option>
                  {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                </select>
              </label>
            )}
          </div>}
          <button type="button" className="btn btn-outline-danger" disabled={disabled} onClick={() => onChange(null)}>Удалить правило</button>
        </>
      )}
      {error && <p role="alert" className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
    </div>
  );
}
