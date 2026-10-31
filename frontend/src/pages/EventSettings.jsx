import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactQuill from "react-quill";
import { Save, Trash2, AlertTriangle, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import * as api from "../mock/api";
import { useApp } from "../components/AppContext";
import Modal from "../components/Modal";
import AutoMailRule from "../components/AutoMailRule";
import EventApiTokens from "../components/EventApiTokens";
import { formatDateInput } from "../lib/dateInput";

const quillModules = {
  toolbar: [
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link"],
    ["clean"],
  ],
};

export function toLocalDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (number) => String(number).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseLocalDateTime(value) {
  if (!value.trim()) return null;
  const match = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const [, day, month, year, hour, minute] = match.map(Number);
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return undefined;
  const date = new Date(year, month - 1, day, hour, minute);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day ||
      date.getHours() !== hour || date.getMinutes() !== minute) return undefined;
  return date.toISOString();
}

const dateTimeTemplate = "дд/мм/гггг чч:мм";

const scheduleKeys = ["registration_starts_at", "registration_ends_at", "participant_data_delete_at"];
const dateInputsFor = (event) => Object.fromEntries(scheduleKeys.map((key) => [key, toLocalDateTime(event[key])]));

export default function EventSettings() {
  const { eventId } = useParams();
  const [ev, setEv] = useState(null);
  const [dateInputs, setDateInputs] = useState({});
  const [now, setNow] = useState(() => Date.now());
  const [templates, setTemplates] = useState([]);
  const [fields, setFields] = useState([]);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [disapproving, setDisapproving] = useState(false);
  const [errors, setErrors] = useState({});
  const [openDelete, setOpenDelete] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const { user, notify } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    (async () => {
      const [e, t, form] = await Promise.all([api.getEvent(eventId), api.listTemplates(eventId), api.getForm(eventId)]);
      setFields(form.fields);
      setEv(e);
      setDateInputs(dateInputsFor(e));
      setTemplates(t);
    })();
  }, [eventId]);

  if (!ev) return <div className="surface p-12 text-center"><span className="spinner" /></div>;

  const registrationOpen = (ev.registration_open ||
    (ev.registration_starts_at && new Date(ev.registration_starts_at).getTime() <= now)) &&
    (!ev.registration_ends_at || new Date(ev.registration_ends_at).getTime() > now);

  const patch = (obj) => {
    setEv({ ...ev, ...obj });
    setErrors((current) => {
      const next = { ...current };
      if (Object.prototype.hasOwnProperty.call(obj, "name")) delete next.title;
      if (
        Object.prototype.hasOwnProperty.call(obj, "success_template_id") ||
        Object.prototype.hasOwnProperty.call(obj, "auto_mail_enabled")
      ) {
        delete next.success_form_template;
      }
      if (Object.prototype.hasOwnProperty.call(obj, "auto_mail_rule")) delete next.auto_mail_rule;
      for (const key of ["registration_starts_at", "registration_ends_at"]) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          delete next.registration_starts_at;
          delete next.registration_ends_at;
        }
      }
      if (Object.prototype.hasOwnProperty.call(obj, "participant_data_delete_at")) delete next.participant_data_delete_at;
      if (Object.prototype.hasOwnProperty.call(obj, "agreement_text")) delete next.agreement_text;
      delete next.general;
      return next;
    });
  };
  const publicFormUrl = `${window.location.origin}/form/${eventId}`;

  const save = async () => {
    const validationErrors = {};
    if (!ev.name.trim()) validationErrors.title = "Введите название мероприятия.";
    if (ev.auto_mail_enabled && !ev.success_template_id) {
      validationErrors.success_form_template = "Выберите шаблон письма для автоматической отправки.";
    }
    if (ev.auto_mail_rule && (!ev.auto_mail_rule.question_id || !Array.isArray(ev.auto_mail_rule.answers))) {
      validationErrors.auto_mail_rule = "Выберите вопрос или удалите незавершённое правило.";
    }
    const schedule = {};
    for (const key of scheduleKeys) {
      schedule[key] = dateInputs[key] === toLocalDateTime(ev[key])
        ? ev[key] || null
        : parseLocalDateTime(dateInputs[key] || "");
      if (schedule[key] === undefined) validationErrors[key] = "Введите дату и время в формате дд/мм/гггг чч:мм (00–23 часа).";
    }
    if (schedule.registration_starts_at && schedule.registration_ends_at &&
        new Date(schedule.registration_ends_at) <= new Date(schedule.registration_starts_at)) {
      validationErrors.registration_ends_at = "Окончание регистрации должно быть позже начала.";
    }
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      await api.updateEvent(eventId, { ...ev, ...schedule });
      const saved = await api.getEvent(eventId);
      setEv(saved);
      setDateInputs(dateInputsFor(saved));
      notify("Параметры сохранены", "success");
    } catch (err) {
      const fieldErrors = err.field_errors || {};
      setErrors({
        donation_amount: fieldErrors.donation_amount,
        participant_data_delete_at: fieldErrors.participant_data_delete_at,
        registration_starts_at: fieldErrors.registration_starts_at,
        registration_ends_at: fieldErrors.registration_ends_at,
        agreement_text: fieldErrors.agreement_text,
        auto_mail_rule: fieldErrors.auto_mail_rule,
        title: fieldErrors.title || fieldErrors.name,
        success_form_template: fieldErrors.success_form_template,
        general: fieldErrors.agreement_text || fieldErrors.participant_data_delete_at || fieldErrors.registration_starts_at || fieldErrors.registration_ends_at || fieldErrors.auto_mail_rule || fieldErrors.title || fieldErrors.name || fieldErrors.success_form_template
          ? ""
          : err.message_ru,
      });
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

  const approve = async () => {
    setApproving(true);
    setErrors({});
    try {
      await api.approveEvent(eventId);
      setEv({ ...ev, is_approved: true });
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
      await api.disapproveEvent(eventId);
      setEv({ ...ev, is_approved: false, registration_open: false });
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
          <button data-testid="event-settings-save" className="btn btn-primary" disabled={saving} onClick={save}>
            {saving ? <span className="spinner" /> : <Save size={14} />} Сохранить
          </button>
        </div>
      </div>

      {registrationOpen && !ev.is_approved && (
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
          <label className="label" htmlFor="donation-amount">Сумма пожертвования, ₽</label>
          <input id="donation-amount" data-testid="event-donation-amount" type="number" min="0" max="1000000" step="0.01"
            className="input" value={ev.donation_amount ?? ""}
            onChange={(e) => patch({ donation_amount: e.target.value })} placeholder="Не задана" />
          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>При положительной сумме после отправки анкеты участник переходит к пожертвованию. Изменения применяются к новым платежам.</p>
          {errors.donation_amount && <p role="alert" className="text-sm mt-2" style={{ color: "var(--danger)" }}>{errors.donation_amount}</p>}
        </div>
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
              disabled={!!ev.registration_ends_at && new Date(ev.registration_ends_at).getTime() <= now}
              checked={!!registrationOpen}
              onChange={(e) => patch({ registration_open: e.target.checked })}
              data-testid="event-reg-open"
              className="w-4 h-4 accent-[color:var(--brand)]"
            />
          </label>
          <label className="flex items-center justify-between surface-soft px-4 py-3 cursor-pointer">
            <div>
              <div className="text-sm font-semibold">Автоматические письма</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>Отправлять письмо после успешной регистрации</div>
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

        <div className="grid md:grid-cols-2 gap-4">
          {[["registration_starts_at", "Дата начала регистрации"], ["registration_ends_at", "Дата окончания регистрации"], ["participant_data_delete_at", "Дата автоудаления данных участников"]].map(([key, label]) => (
            <div key={key}>
              <label className="label" htmlFor={key}>{label}</label>
              <div className="relative">
                <input
                  id={key}
                  type="text"
                  inputMode="numeric"
                  maxLength={16}
                  aria-invalid={!!errors[key]}
                  className={`input font-mono ${errors[key] ? "error" : ""}`}
                  value={dateInputs[key] || ""}
                  onChange={(e) => {
                    const input = e.target;
                    const value = formatDateInput(input, dateInputs[key] || "", e.nativeEvent?.inputType);
                    setDateInputs((current) => ({ ...current, [key]: value }));
                    const parsed = parseLocalDateTime(value);
                    patch({ [key]: parsed === undefined ? ev[key] : parsed });
                  }}
                  data-testid={`event-${key}`}
                />
                <div aria-hidden="true" className="absolute inset-0 border border-transparent rounded-lg px-3 py-2 text-sm font-mono whitespace-pre pointer-events-none overflow-hidden">
                  <span style={{ visibility: "hidden" }}>{dateInputs[key] || ""}</span>
                  <span data-testid={`event-${key}-template`} style={{ color: "var(--text-muted)" }}>{dateTimeTemplate.slice((dateInputs[key] || "").length)}</span>
                </div>
              </div>
              {errors[key] && <div className="text-xs mt-1" role="alert" style={{ color: "var(--danger)" }}>{errors[key]}</div>}
            </div>
          ))}
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Время в вашем часовом поясе ({Intl.DateTimeFormat().resolvedOptions().timeZone}).
          Начало автоматически открывает регистрацию, окончание закрывает её.
          Одобрение администратора обязательно. Регистрацию можно открыть вручную до даты начала.
          В дату автоудаления безвозвратно очищаются участники, их ответы и файлы, сессии загрузки и исходящие письма только этого мероприятия.
        </p>

        {ev.participant_data_deleted_at && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Данные участников очищены: {toLocalDateTime(ev.participant_data_deleted_at)}.
          </p>
        )}

        <div>
          <label className="label">Шаблон письма по умолчанию</label>
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

      <AutoMailRule rule={ev.auto_mail_rule} fields={fields} templates={templates}
        disabled={saving || !ev.auto_mail_enabled} error={errors.auto_mail_rule}
        onChange={(rule) => patch({ auto_mail_rule: rule })} />

      <div className="surface p-6 mb-6 space-y-5">
        <div>
          <label className="label" htmlFor="event-agreement-text">Текст согласия на обработку персональных данных</label>
          <textarea
            id="event-agreement-text"
            data-testid="event-agreement-text"
            className={`input ${errors.agreement_text ? "error" : ""}`}
            rows={10}
            maxLength={50000}
            value={ev.agreement_text || ""}
            onChange={(e) => patch({ agreement_text: e.target.value })}
            aria-describedby="event-agreement-text-help"
            aria-invalid={!!errors.agreement_text}
          />
          <p id="event-agreement-text-help" className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Этот текст заменит автоматически сформированное согласие в PDF после сохранения.
            Если оставить поле пустым, используется автоматический текст.
          </p>
          {errors.agreement_text && <div className="text-xs mt-1" role="alert" style={{ color: "var(--danger)" }}>{errors.agreement_text}</div>}
        </div>
      </div>

      <div className="surface p-6 mb-6 space-y-5">
        <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Тексты страниц</h3>
        <QuillField label="Описание мероприятия" value={ev.description} onChange={(v) => patch({ description: v })} />
        <QuillField label="Текст успешной отправки" value={ev.success_form_description} onChange={(v) => patch({ success_form_description: v })} />
        <QuillField label="Текст ошибки отправки" value={ev.fail_form_description} onChange={(v) => patch({ fail_form_description: v })} />
        <QuillField label="Регистрация закрыта" value={ev.closed_registration_description} onChange={(v) => patch({ closed_registration_description: v })} />
      </div>

      <EventApiTokens key={eventId} eventId={eventId} />

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
