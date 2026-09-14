import { ResourceList } from "../components/FormResources";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Check, AlertTriangle } from "lucide-react";
import * as api from "../mock/api";
import SafeHtml from "../components/SafeHtml";
import churchLogo from "../assets/church-logo.svg";

// Public form page — no auth
export function PublicForm() {
  const { id: eventId } = useParams();
  const [ev, setEv] = useState(null);
  const [form, setForm] = useState({ fields: [] });
  const [data, setData] = useState({});
  const [customValues, setCustomValues] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const publicForm = await api.getPublicForm(eventId);
        setEv(publicForm.event);
        setForm({ fields: publicForm.fields });
      } catch (err) {
        setError(err.message_ru || "Не удалось загрузить анкету.");
      }
    })();
  }, [eventId]);

  if (error && !ev) {
    return (
      <PublicShell title="Анкета недоступна">
        <div role="alert" className="text-base" style={{ color: "var(--danger)" }}>{error}</div>
      </PublicShell>
    );
  }

  if (!ev) {
    return <div className="min-h-screen grid place-items-center text-base" style={{ color: "var(--text-muted)" }}>Загрузка…</div>;
  }

  if (!ev.registration_open) {
    return (
      <PublicShell title={ev.name} prominentTitle>
        <SafeHtml className="prose prose-base max-w-none" html={ev.closed_registration_description || "<p>Регистрация закрыта.</p>"} />
      </PublicShell>
    );
  }

  const visibleFields = form.fields.filter((f) => !f.hidden);
  const requiredFields = visibleFields.filter((f) => f.required && f.type !== "filler");
  const hasValue = (f) => {
    const v = data[f.id];
    const hasCustom = Object.prototype.hasOwnProperty.call(customValues, f.id)
      && String(customValues[f.id]).trim().length > 0;
    if (Array.isArray(v)) return v.length > 0 || hasCustom;
    return (v && String(v).trim().length > 0) || hasCustom;
  };
  const customValuesAreValid = Object.values(customValues).every(
    (value) => String(value).trim().length > 0,
  );
  const isValid = requiredFields.every(hasValue) && customValuesAreValid;
  const filled = requiredFields.filter(hasValue).length;
  const progress = requiredFields.length === 0 ? 100 : Math.round((filled / requiredFields.length) * 100);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.submitParticipant(eventId, data, form.fields, customValues);
      navigate(`/form/${eventId}/success`);
    } catch (err) {
      setError(err.message_ru || ev.fail_form_description || "Не удалось отправить анкету.");
    } finally {
      setSubmitting(false);
    }
  };

  const setCustomValue = (fieldId, value) => {
    setCustomValues((current) => {
      const next = { ...current };
      if (value === undefined) delete next[fieldId];
      else next[fieldId] = value;
      return next;
    });
  };

  return (
    <PublicShell title={ev.name} prominentTitle>
      {ev.description && (
        <SafeHtml className="prose prose-base max-w-none mb-6" html={ev.description} />
      )}

      {/* progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-1.5" style={{ color: "var(--text-dim)" }}>
          <span>Прогресс заполнения</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elev-2)" }}>
          <div className="h-full transition-all" style={{ width: `${progress}%`, background: "var(--brand)" }} />
        </div>
      </div>

      <form onSubmit={submit} className="space-y-5" data-testid="public-form">
        {visibleFields.map((f) => (
          <PublicField
            key={f.id}
            field={f}
            eventId={eventId}
            value={data[f.id]}
            customValue={customValues[f.id]}
            onChange={(v) => setData((current) => ({ ...current, [f.id]: v }))}
            onCustomChange={(v) => setCustomValue(f.id, v)}
          />
        ))}
        {error && (
          <div role="alert" className="space-y-2" style={{ color: "var(--danger)" }}>
            {ev.fail_form_description && (
              <SafeHtml className="prose prose-base max-w-none" html={ev.fail_form_description} />
            )}
            <div className="text-base">{error}</div>
          </div>
        )}
        <div className="pt-3">
          <button type="submit" className="btn btn-primary w-full !text-base" disabled={!isValid || submitting} data-testid="public-form-submit">
            {submitting ? <span className="spinner" /> : <Check size={14} />} Отправить заявку
          </button>
        </div>
      </form>
    </PublicShell>
  );
}

function optionName(option) {
  return typeof option === "object" && option !== null ? option.name : option;
}

function PublicField({ eventId, field, value, customValue, onChange, onCustomChange }) {
  if (field.type === "filler") {
    return (
      <div className="pt-2">
        <h3 className="text-xl font-bold">{field.title}</h3>
        {field.description && <p className="text-base" style={{ color: "var(--text-dim)" }}>{field.description}</p>}
        <ResourceList publicView eventId={eventId} resources={field.resources} />
      </div>
    );
  }
  const label = (
    <label className="block text-base font-semibold mb-2">
      {field.title} {field.required && <span style={{ color: "var(--danger)" }}>*</span>}
    </label>
  );
  return (
    <div>
      {label}
      {field.description && <div className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>{field.description}</div>}
      <ResourceList publicView eventId={eventId} resources={field.resources} />
      {field.type === "textarea" ? (
        <textarea rows={3} className="input !text-base" placeholder={field.placeholder} value={value || ""} onChange={(e) => onChange(e.target.value)} />
      ) : field.type === "date" ? (
        <input type="date" className="input !text-base" value={value || ""} onChange={(e) => onChange(e.target.value)} />
      ) : field.type === "email" ? (
        <input type="email" className="input !text-base" placeholder={field.placeholder} value={value || ""} onChange={(e) => onChange(e.target.value)} />
      ) : field.type === "radio" || field.type === "donation-radio" ? (
        <div className="space-y-2">
          {(field.options || []).map((o) => (
            <label key={optionName(o)} className="flex items-center gap-2 text-base">
              <input
                type="radio"
                name={field.id}
                checked={value === optionName(o) && customValue === undefined}
                onChange={() => { onCustomChange(undefined); onChange(optionName(o)); }}
              />
              {optionName(o)}
            </label>
          ))}
          {field.type === "radio" && field.allow_other && (
            <label className="flex items-center gap-2 text-base">
              <input
                type="radio"
                name={field.id}
                checked={customValue !== undefined}
                onChange={() => { onChange(""); onCustomChange(""); }}
              />
              Другое
              {customValue !== undefined && (
                <input
                  className="input !text-base"
                  maxLength={255}
                  placeholder="Введите свой вариант"
                  value={customValue}
                  onChange={(e) => onCustomChange(e.target.value)}
                />
              )}
            </label>
          )}
        </div>
      ) : field.type === "checkbox" ? (
        <div className="space-y-2">
          {(field.options || []).map((o) => {
            const arr = Array.isArray(value) ? value : [];
            const name = optionName(o);
            return (
              <label key={name} className="flex items-center gap-2 text-base">
                <input
                  type="checkbox"
                  checked={arr.includes(name)}
                  onChange={() => onChange(arr.includes(name) ? arr.filter((x) => x !== name) : [...arr, name])}
                />
                {name}
              </label>
            );
          })}
          {field.allow_other && (
            <label className="flex items-center gap-2 text-base">
              <input
                type="checkbox"
                checked={customValue !== undefined}
                onChange={(e) => onCustomChange(e.target.checked ? "" : undefined)}
              />
              Другое
              {customValue !== undefined && (
                <input
                  className="input !text-base"
                  maxLength={255}
                  placeholder="Введите свой вариант"
                  value={customValue}
                  onChange={(e) => onCustomChange(e.target.value)}
                />
              )}
            </label>
          )}
        </div>
      ) : (
        <input className="input !text-base" placeholder={field.placeholder} value={value || ""} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

export function PublicSuccess() {
  return <PublicResult success />;
}

export function PublicFail() {
  return <PublicResult />;
}

function PublicResult({ success = false }) {
  const { id: eventId } = useParams();
  const [ev, setEv] = useState(null);

  useEffect(() => {
    api.getPublicForm(eventId).then(({ event }) => setEv(event)).catch(() => {});
  }, [eventId]);

  const description = success
    ? ev?.success_form_description
    : ev?.fail_form_description;

  return (
    <PublicShell title={ev?.name || "Мероприятие"}>
      <div className="text-center py-6">
        <div
          className="w-14 h-14 rounded-full grid place-items-center mx-auto mb-4"
          style={success
            ? { background: "var(--brand-soft)", color: "var(--brand)" }
            : { background: "var(--danger-soft)", color: "var(--danger)" }}
        >
          {success ? <Check size={26} /> : <AlertTriangle size={26} />}
        </div>
        <h1 className="text-3xl font-extrabold mb-2">
          {success ? "Регистрация завершена" : "Не удалось отправить"}
        </h1>
        {description ? (
          <SafeHtml className="prose prose-base max-w-none" html={description} />
        ) : !success ? (
          <p className="text-base" style={{ color: "var(--text-dim)" }}>
            Попробуйте ещё раз позднее или свяжитесь с организаторами.
          </p>
        ) : null}
      </div>
    </PublicShell>
  );
}

function PublicShell({ title, children, prominentTitle = false }) {
  return (
    <div className="min-h-screen grain px-4 py-10" style={{ background: "var(--bg)" }}>
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(900px 400px at 15% -5%, var(--brand-soft), transparent 60%)",
        }}
      />
      <div className="max-w-2xl mx-auto relative z-10">
        <div className="flex items-center gap-3 mb-6" data-testid="public-brand">
          <div className="w-14 h-14 rounded-lg grid place-items-center shrink-0" style={{ background: "#0b0f14" }}>
            <img
              src={churchLogo}
              alt=""
              className="w-12 h-12"
            />
          </div>
          <div className="font-extrabold text-xl leading-tight">
            Московская Церковь Христа
          </div>
        </div>
        <div className="surface p-8">
          {prominentTitle ? (
            <h1 className="text-3xl font-extrabold tracking-tight mb-6" data-testid="public-event-title">
              {title}
            </h1>
          ) : (
            <div className="text-sm mb-2 tracking-wider uppercase" style={{ color: "var(--text-muted)" }}>{title}</div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
