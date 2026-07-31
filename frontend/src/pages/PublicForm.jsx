import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Calendar, Check, AlertTriangle } from "lucide-react";
import * as api from "../mock/api";
import SafeHtml from "../components/SafeHtml";

// Public form page — no auth
export function PublicForm() {
  const { id: eventId } = useParams();
  const [ev, setEv] = useState(null);
  const [form, setForm] = useState({ fields: [] });
  const [data, setData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const [e, f] = await Promise.all([api.getEvent(eventId), api.getForm(eventId)]);
        setEv(e);
        setForm(f);
      } catch (err) {
        setError(err.message_ru || "Ошибка");
      }
    })();
  }, [eventId]);

  if (!ev || !form) {
    return <div className="min-h-screen grid place-items-center text-sm" style={{ color: "var(--text-muted)" }}>Загрузка…</div>;
  }

  if (!ev.registration_open) {
    return (
      <PublicShell title={ev.name}>
        <SafeHtml className="prose prose-sm max-w-none" html={ev.closed_registration_description || "<p>Регистрация закрыта.</p>"} />
      </PublicShell>
    );
  }

  const visibleFields = form.fields.filter((f) => !f.hidden);
  const requiredFields = visibleFields.filter((f) => f.required && f.type !== "filler");
  const isValid = requiredFields.every((f) => {
    const v = data[f.id];
    if (Array.isArray(v)) return v.length > 0;
    return v && String(v).trim().length > 0;
  });
  const filled = requiredFields.filter((f) => {
    const v = data[f.id];
    if (Array.isArray(v)) return v.length > 0;
    return v && String(v).trim().length > 0;
  }).length;
  const progress = requiredFields.length === 0 ? 100 : Math.round((filled / requiredFields.length) * 100);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.submitParticipant(eventId, data);
      navigate(`/form/${eventId}/success`);
    } catch (err) {
      navigate(`/form/${eventId}/fail`);
    }
  };

  return (
    <PublicShell title={ev.name}>
      {ev.description && (
        <SafeHtml className="prose prose-sm max-w-none mb-6" html={ev.description} />
      )}

      {/* progress */}
      <div className="mb-6">
        <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--text-dim)" }}>
          <span>Прогресс заполнения</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elev-2)" }}>
          <div className="h-full transition-all" style={{ width: `${progress}%`, background: "var(--brand)" }} />
        </div>
      </div>

      <form onSubmit={submit} className="space-y-5" data-testid="public-form">
        {visibleFields.map((f) => (
          <PublicField key={f.id} field={f} value={data[f.id]} onChange={(v) => setData({ ...data, [f.id]: v })} />
        ))}
        <div className="pt-3">
          <button type="submit" className="btn btn-primary w-full" disabled={!isValid || submitting} data-testid="public-form-submit">
            {submitting ? <span className="spinner" /> : <Check size={14} />} Отправить заявку
          </button>
        </div>
      </form>
    </PublicShell>
  );
}

function PublicField({ field, value, onChange }) {
  if (field.type === "filler") {
    return (
      <div className="pt-2">
        <h3 className="text-lg font-bold">{field.title}</h3>
        {field.description && <p className="text-sm" style={{ color: "var(--text-dim)" }}>{field.description}</p>}
      </div>
    );
  }
  const label = (
    <label className="label">
      {field.title} {field.required && <span style={{ color: "var(--danger)" }}>*</span>}
    </label>
  );
  return (
    <div>
      {label}
      {field.description && <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{field.description}</div>}
      {field.type === "textarea" ? (
        <textarea rows={3} className="input" placeholder={field.placeholder} value={value || ""} onChange={(e) => onChange(e.target.value)} />
      ) : field.type === "date" ? (
        <input type="date" className="input" value={value || ""} onChange={(e) => onChange(e.target.value)} />
      ) : field.type === "email" ? (
        <input type="email" className="input" placeholder={field.placeholder} value={value || ""} onChange={(e) => onChange(e.target.value)} />
      ) : field.type === "radio" ? (
        <div className="space-y-2">
          {(field.options || []).map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm">
              <input type="radio" name={field.id} checked={value === o} onChange={() => onChange(o)} /> {o}
            </label>
          ))}
        </div>
      ) : field.type === "checkbox" ? (
        <div className="space-y-2">
          {(field.options || []).map((o) => {
            const arr = Array.isArray(value) ? value : [];
            return (
              <label key={o} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={arr.includes(o)}
                  onChange={() => onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o])}
                />
                {o}
              </label>
            );
          })}
        </div>
      ) : (
        <input className="input" placeholder={field.placeholder} value={value || ""} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

export function PublicSuccess() {
  return (
    <PublicShell title="Мероприятие">
      <div className="text-center py-6">
        <div className="w-14 h-14 rounded-full grid place-items-center mx-auto mb-4" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}>
          <Check size={26} />
        </div>
        <h1 className="text-2xl font-extrabold mb-2">Заявка отправлена</h1>
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>Спасибо! Мы получили вашу анкету и свяжемся с вами.</p>
      </div>
    </PublicShell>
  );
}

export function PublicFail() {
  return (
    <PublicShell title="Мероприятие">
      <div className="text-center py-6">
        <div className="w-14 h-14 rounded-full grid place-items-center mx-auto mb-4" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          <AlertTriangle size={26} />
        </div>
        <h1 className="text-2xl font-extrabold mb-2">Не удалось отправить</h1>
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>Попробуйте ещё раз позднее или свяжитесь с организаторами.</p>
      </div>
    </PublicShell>
  );
}

function PublicShell({ title, children }) {
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
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-md grid place-items-center" style={{ background: "var(--brand)", color: "#04120b" }}>
            <Calendar size={16} strokeWidth={2.4} />
          </div>
          <div className="font-extrabold text-lg tracking-tight">
            ev<span style={{ color: "var(--brand)" }}>man</span>
          </div>
        </div>
        <div className="surface p-8">
          <div className="text-xs mb-2 tracking-wider uppercase" style={{ color: "var(--text-muted)" }}>{title}</div>
          {children}
        </div>
      </div>
    </div>
  );
}
