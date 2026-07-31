import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Edit3, Mail, Trash2, Save, X } from "lucide-react";
import * as api from "../mock/api";
import Modal from "../components/Modal";
import { useApp } from "../components/AppContext";

const STATUS_OPTIONS = [
  { value: "accepted", label: "Принят" },
  { value: "pending", label: "На проверке" },
  { value: "rejected", label: "Отклонён" },
];

export default function ParticipantDetail() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const eventId = search.get("event");
  const navigate = useNavigate();
  const { notify } = useApp();
  const [participant, setParticipant] = useState(null);
  const [form, setForm] = useState({ fields: [] });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    (async () => {
      const [p, f] = await Promise.all([api.getParticipant(eventId, id), api.getForm(eventId)]);
      setParticipant(p);
      setForm(f);
      setDraft(p?.answers || {});
    })();
  }, [id, eventId]);

  if (!participant) {
    return (
      <div className="surface p-10 text-center" style={{ color: "var(--text-muted)" }}>
        <span className="spinner" /> Загружаем участника…
      </div>
    );
  }

  const changeStatus = async (s) => {
    await api.updateParticipant(eventId, id, { status: s });
    setParticipant({ ...participant, status: s });
    notify("Статус обновлён", "success");
  };

  const saveEdits = async () => {
    setSaving(true);
    const fullNameField = form.fields.find((f) => f.type === "full_name");
    const emailField = form.fields.find((f) => f.type === "email");
    await api.updateParticipant(eventId, id, {
      answers: draft,
      full_name: fullNameField ? draft[fullNameField.id] : participant.full_name,
      email: emailField ? draft[emailField.id] : participant.email,
    });
    setParticipant({
      ...participant,
      answers: draft,
      full_name: fullNameField ? draft[fullNameField.id] : participant.full_name,
      email: emailField ? draft[emailField.id] : participant.email,
    });
    setEditing(false);
    setSaving(false);
    notify("Изменения сохранены", "success");
  };

  const del = async () => {
    await api.deleteParticipant(eventId, id);
    notify("Участник удалён", "success");
    navigate(`/events/${eventId}/participants`);
  };

  return (
    <div className="max-w-4xl">
      <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
        Участники &nbsp;›&nbsp; {participant.full_name}
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold">{participant.full_name || "—"}</h1>
          <div className="text-sm mt-1" style={{ color: "var(--text-dim)" }}>{participant.email}</div>
        </div>
        <div className="flex items-center gap-2">
          {!editing ? (
            <button onClick={() => setEditing(true)} className="btn btn-ghost" data-testid="participant-edit-btn">
              <Edit3 size={14} /> Редактировать
            </button>
          ) : (
            <>
              <button onClick={() => { setEditing(false); setDraft(participant.answers); }} className="btn btn-ghost">
                <X size={14} /> Отмена
              </button>
              <button onClick={saveEdits} disabled={saving} className="btn btn-primary" data-testid="participant-save-btn">
                {saving ? <span className="spinner" /> : <Save size={14} />} Сохранить
              </button>
            </>
          )}
          <button
            onClick={() => navigate(`/events/${eventId}/mail/create?to=${encodeURIComponent(participant.email)}`)}
            className="btn btn-ghost"
            data-testid="participant-mail-btn"
          >
            <Mail size={14} /> Написать письмо
          </button>
          <button onClick={() => setConfirmDelete(true)} className="btn btn-outline-danger" data-testid="participant-delete-btn">
            <Trash2 size={14} /> Удалить
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-6">
        <div className="surface p-4 md:col-span-1">
          <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Статус анкеты</div>
          <select
            value={participant.status}
            onChange={(e) => changeStatus(e.target.value)}
            className="input mt-1"
            data-testid="participant-status"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="surface p-4">
          <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Дата регистрации</div>
          <div className="text-sm font-medium">{new Date(participant.registered_at).toLocaleString("ru-RU")}</div>
        </div>
        <div className="surface p-4">
          <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Дата оплаты</div>
          <div className="text-sm font-medium">{participant.payment_date ? new Date(participant.payment_date).toLocaleString("ru-RU") : "—"}</div>
        </div>
      </div>

      <div className="surface p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
          Ответы анкеты
        </h3>
        <div className="grid gap-4">
          {form.fields.filter((f) => f.type !== "filler" && !f.hidden).map((f) => (
            <div key={f.id}>
              <div className="label">{f.title}</div>
              {editing ? (
                <FieldInput
                  field={f}
                  value={draft[f.id]}
                  onChange={(v) => setDraft({ ...draft, [f.id]: v })}
                />
              ) : (
                <div className="text-sm" style={{ color: "var(--text)" }}>
                  {renderVal(participant.answers?.[f.id])}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Удалить участника?"
        testid="delete-participant-modal"
        footer={
          <>
            <button onClick={() => setConfirmDelete(false)} className="btn btn-ghost">Отмена</button>
            <button onClick={del} className="btn btn-danger" data-testid="confirm-delete-participant">
              Удалить
            </button>
          </>
        }
      >
        <p className="text-sm">
          Действие нельзя отменить. Участник <b>{participant.full_name}</b> будет удалён без возможности восстановления.
        </p>
      </Modal>
    </div>
  );
}

function renderVal(v) {
  if (v == null || v === "") return <span style={{ color: "var(--text-muted)" }}>—</span>;
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

function FieldInput({ field, value, onChange }) {
  if (field.type === "textarea")
    return <textarea rows={3} className="input" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
  if (field.type === "date")
    return <input type="date" className="input" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
  if (field.type === "radio")
    return (
      <div className="flex flex-wrap gap-2">
        {(field.options || []).map((o) => (
          <label key={o} className={`chip cursor-pointer ${value === o ? "chip-brand" : ""}`}>
            <input type="radio" className="hidden" checked={value === o} onChange={() => onChange(o)} />
            {o}
          </label>
        ))}
      </div>
    );
  if (field.type === "checkbox") {
    const arr = Array.isArray(value) ? value : [];
    return (
      <div className="flex flex-wrap gap-2">
        {(field.options || []).map((o) => (
          <label key={o} className={`chip cursor-pointer ${arr.includes(o) ? "chip-brand" : ""}`}>
            <input
              type="checkbox"
              className="hidden"
              checked={arr.includes(o)}
              onChange={() => onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o])}
            />
            {o}
          </label>
        ))}
      </div>
    );
  }
  return <input className="input" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
}
