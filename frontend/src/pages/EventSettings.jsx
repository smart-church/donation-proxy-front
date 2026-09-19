import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactQuill from "react-quill";
import { Trash2, AlertTriangle, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import * as api from "../mock/api";
import { useApp } from "../components/AppContext";
import Modal from "../components/Modal";
import useEventSettings from "../hooks/useEventSettings";

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
  const [templates, setTemplates] = useState([]);
  const [approving, setApproving] = useState(false);
  const [disapproving, setDisapproving] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const { user, notify } = useApp();
  const navigate = useNavigate();
  const { ev, patch, errors, setErrors, status, save, stop, resume } = useEventSettings(eventId, notify);

  useEffect(() => {
    let active = true;
    setTemplates([]);
    api.listTemplates(eventId).then((items) => { if (active) setTemplates(items); })
      .catch((error) => { if (active) notify(error.message_ru || "Не удалось загрузить шаблоны", "error"); });
    return () => { active = false; };
  }, [eventId, notify]);

  if (!ev) return <div className="surface p-12 text-center">{errors.general || <span className="spinner" />}</div>;
  const publicFormUrl = `${window.location.origin}/form/${eventId}`;

  const del = async () => {
    if (confirmName.trim() !== ev.name.trim()) return;
    await stop();
    try {
      await api.deleteEvent(eventId);
      notify("Мероприятие удалено", "success");
      navigate("/events");
    } catch (error) {
      resume();
      setErrors({ general: error.message_ru || "Не удалось удалить мероприятие." });
    }
  };

  const approve = async () => {
    setApproving(true);
    setErrors({});
    try {
      if (!await save()) return;
      await api.approveEvent(eventId);
      patch({ is_approved: true }, true);
      notify("Мероприятие одобрено", "success");
    } catch (err) {
      setErrors({ general: err.message_ru });
    } finally {
      setApproving(false);
    }
  };

  const disapprove = async () => {
    setDisapproving(true);
    setErrors({});
    try {
      if (!await save()) return;
      await api.disapproveEvent(eventId);
      patch({ is_approved: false, registration_open: false }, true);
      notify("Одобрение мероприятия отозвано", "success");
    } catch (err) {
      setErrors({ general: err.message_ru });
    } finally {
      setDisapproving(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
        Редактировать мероприятие &nbsp;›&nbsp; Параметры
      </div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold">Параметры</h1>
        <div className="flex items-center gap-2">
          {user?.is_admin && !ev.is_approved && (
            <button
              data-testid="event-approve"
              className="btn btn-ghost"
              disabled={approving}
              onClick={approve}
            >
              {approving ? <span className="spinner" /> : <CheckCircle2 size={14} />}
              Одобрить
            </button>
          )}
          {user?.is_admin && ev.is_approved && (
            <button
              data-testid="event-disapprove"
              className="btn btn-outline-danger"
              disabled={disapproving}
              onClick={disapprove}
            >
              {disapproving ? <span className="spinner" /> : <XCircle size={14} />}
              Отозвать одобрение
            </button>
          )}
        </div>
      </div>

      <div className="text-sm mb-4" role="status" aria-live="polite" style={{ color: status === "error" ? "var(--danger)" : "var(--text-muted)" }}>
        {{ idle: "Изменения сохраняются автоматически", pending: "Есть несохранённые изменения", saving: "Сохранение…", saved: "Все изменения сохранены", error: "Изменения не сохранены" }[status]}
      </div>

      {ev.registration_open && !ev.is_approved && (
        <div
          className="mb-6 p-3 rounded-lg"
          style={{
            background: "rgba(255, 193, 7, 0.1)",
            borderLeft: "4px solid #FFC107",
          }}
          data-testid="event-approval-required-warning"
        >
          <p style={{ color: "#856404", fontSize: "14px", fontWeight: "500" }}>
            ⚠️ Регистрация недоступна. Необходимо одобрение от администратора.
          </p>
        </div>
      )}

      {errors.general && (
        <div className="mb-6 text-sm" role="alert" style={{ color: "var(--danger)" }}>
          {errors.general}
        </div>
      )}

      <div className="surface p-6 mb-6 space-y-5">
        <div>
          <label className="label">Ссылка на анкету мероприятия</label>
          <a
            href={`/form/${eventId}`}
            target="_blank"
            rel="noreferrer"
            className="input flex items-center justify-between gap-3"
            data-testid="event-public-form-link"
          >
            <span className="truncate">{publicFormUrl}</span>
            <ExternalLink size={16} className="shrink-0" />
          </a>
        </div>
        <div>
          <label className="label">Название</label>
          <input
            data-testid="event-name-input"
            className={`input ${errors.title ? "error" : ""}`}
            value={ev.name}
            onChange={(e) => patch({ name: e.target.value })}
          />
          {errors.title && <div className="text-xs mt-1" role="alert" style={{ color: "var(--danger)" }}>{errors.title}</div>}
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
            className={`input ${errors.success_form_template ? "error" : ""}`}
            value={ev.success_template_id || ""}
            onChange={(e) => patch({ success_template_id: e.target.value || null })}
            disabled={!ev.auto_mail_enabled}
            data-testid="event-success-template"
          >
            <option value="">— не выбрано —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {errors.success_form_template && (
            <div className="text-xs mt-1" role="alert" style={{ color: "var(--danger)" }} data-testid="event-success-template-error">
              {errors.success_form_template}
            </div>
          )}
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
      <ReactQuill
        theme="snow"
        value={value || ""}
        onChange={onChange}
        modules={quillModules}
      />
    </div>
  );
}
