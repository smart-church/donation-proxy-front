import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactQuill from "react-quill";
import { Save, Trash2, AlertTriangle } from "lucide-react";
import * as api from "../mock/api";
import { useApp } from "../components/AppContext";
import Modal from "../components/Modal";

const quillModules = {
  toolbar: [
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link"],
    ["clean"],
  ],
};

export default function EventSettings() {
  const { eventId } = useParams();
  const [ev, setEv] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [openDelete, setOpenDelete] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const { notify } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const [e, t] = await Promise.all([api.getEvent(eventId), api.listTemplates(eventId)]);
      setEv(e);
      setTemplates(t);
    })();
  }, [eventId]);

  if (!ev) return <div className="surface p-12 text-center"><span className="spinner" /></div>;

  const patch = (obj) => setEv({ ...ev, ...obj });

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await api.updateEvent(eventId, ev);
      notify("Параметры сохранены", "success");
    } catch (err) {
      setError(err.message_ru);
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (confirmName.trim() !== ev.name.trim()) return;
    await api.deleteEvent(eventId);
    notify("Мероприятие удалено", "success");
    navigate("/events");
  };

  return (
    <div className="max-w-4xl">
      <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
        Редактировать мероприятие &nbsp;›&nbsp; Параметры
      </div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold">Параметры</h1>
        <button data-testid="event-settings-save" className="btn btn-primary" disabled={saving} onClick={save}>
          {saving ? <span className="spinner" /> : <Save size={14} />} Сохранить
        </button>
      </div>

      <div className="surface p-6 mb-6 space-y-5">
        <div>
          <label className="label">Название</label>
          <input
            data-testid="event-name-input"
            className={`input ${error ? "error" : ""}`}
            value={ev.name}
            onChange={(e) => patch({ name: e.target.value })}
          />
          {error && <div className="text-xs mt-1" style={{ color: "var(--danger)" }}>{error}</div>}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <label className="flex items-center justify-between surface-soft px-4 py-3 cursor-pointer">
            <div>
              <div className="text-sm font-semibold">Регистрация открыта</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>Пользователи смогут отправлять анкеты</div>
            </div>
            <input
              type="checkbox"
              checked={ev.registration_open}
              onChange={(e) => patch({ registration_open: e.target.checked })}
              data-testid="event-reg-open"
              className="w-4 h-4 accent-[color:var(--brand)]"
            />
          </label>
          <label className="flex items-center justify-between surface-soft px-4 py-3 cursor-pointer">
            <div>
              <div className="text-sm font-semibold">Автоматические письма</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>Отправлять письмо при заполнении анкеты</div>
            </div>
            <input
              type="checkbox"
              checked={ev.auto_mail_enabled}
              onChange={(e) => patch({ auto_mail_enabled: e.target.checked })}
              data-testid="event-auto-mail"
              className="w-4 h-4 accent-[color:var(--brand)]"
            />
          </label>
        </div>

        <div>
          <label className="label">Письмо о заполненной анкете</label>
          <select
            className="input"
            value={ev.success_template_id || ""}
            onChange={(e) => patch({ success_template_id: e.target.value || null })}
            disabled={!ev.auto_mail_enabled}
          >
            <option value="">— не выбрано —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="surface p-6 mb-6 space-y-5">
        <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Тексты страниц</h3>
        <QuillField label="Описание мероприятия" value={ev.description} onChange={(v) => patch({ description: v })} />
        <QuillField label="Текст успешной отправки" value={ev.success_form_description} onChange={(v) => patch({ success_form_description: v })} />
        <QuillField label="Текст ошибки отправки" value={ev.fail_form_description} onChange={(v) => patch({ fail_form_description: v })} />
        <QuillField label="Регистрация закрыта" value={ev.closed_registration_description} onChange={(v) => patch({ closed_registration_description: v })} />
      </div>

      <div
        className="rounded-xl p-5 border"
        style={{ background: "var(--danger-soft)", borderColor: "var(--danger)" }}
      >
        <div className="flex items-center gap-2 mb-2 font-bold" style={{ color: "var(--danger)" }}>
          <AlertTriangle size={16} /> Опасная зона
        </div>
        <p className="text-sm mb-4" style={{ color: "var(--text-dim)" }}>
          Удаление мероприятия невозможно отменить. Все данные, анкеты и письма будут утеряны.
        </p>
        <button className="btn btn-danger" onClick={() => setOpenDelete(true)} data-testid="event-delete-btn">
          <Trash2 size={14} /> Удалить мероприятие
        </button>
      </div>

      <Modal
        open={openDelete}
        onClose={() => setOpenDelete(false)}
        title="Подтвердите удаление"
        testid="event-delete-modal"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setOpenDelete(false)}>Отмена</button>
            <button
              className="btn btn-danger"
              disabled={confirmName.trim() !== ev.name.trim()}
              onClick={del}
              data-testid="event-delete-confirm"
            >
              Удалить навсегда
            </button>
          </>
        }
      >
        <p className="text-sm mb-3">
          Для подтверждения введите название мероприятия: <b>{ev.name}</b>
        </p>
        <input
          className="input"
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          placeholder={ev.name}
          data-testid="event-delete-name-input"
        />
      </Modal>
    </div>
  );
}

function QuillField({ label, value, onChange }) {
  return (
    <div>
      <label className="label">{label}</label>
      <ReactQuill theme="snow" value={value || ""} onChange={onChange} modules={quillModules} />
    </div>
  );
}
