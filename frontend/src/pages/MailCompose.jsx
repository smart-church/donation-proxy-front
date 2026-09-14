import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import ReactQuill from "react-quill";
import { Send, X, Plus } from "lucide-react";
import * as api from "../mock/api";
import AttachmentList from "../components/AttachmentList";
import FileUploader from "../components/FileUploader";
import SafeHtml from "../components/SafeHtml";
import { useApp } from "../components/AppContext";

const quillModules = {
  toolbar: [["bold", "italic", "underline"], [{ list: "ordered" }, { list: "bullet" }], ["link"], ["clean"]],
};
const isValidEmail = (value) => /^\S+@\S+\.\S+$/.test(value);

export default function MailCompose() {
  const { eventId } = useParams();
  const [search] = useSearchParams();
  const { notify } = useApp();
  const navigate = useNavigate();

  const [recipients, setRecipients] = useState(() => (search.get("to") ? [search.get("to")] : []));
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [sending, setSending] = useState(false);
  const [manualFiles, setManualFiles] = useState([]);
  const [excluded, setExcluded] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [templateError, setTemplateError] = useState("");
  const requestRef = useRef(null);

  useEffect(() => {
    api.listTemplates(eventId).then(setTemplates);
  }, [eventId]);

  useEffect(() => {
    let cancel = false;
    if (!query) {
      setSuggestions([]);
      return;
    }
    api.mailSuggestions(eventId, query).then((s) => {
      if (!cancel) setSuggestions(s);
    });
    return () => (cancel = true);
  }, [query, eventId]);

  const addRecipient = (email) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      notify("Введите корректный email получателя", "error");
      return;
    }
    setRecipients((current) => (
      current.some((item) => item.toLowerCase() === normalizedEmail)
        ? current
        : [...current, normalizedEmail]
    ));
    setQuery("");
  };
  const removeRecipient = (email) => setRecipients((r) => r.filter((x) => x !== email));

  const send = async () => {
    if (sending || uploading || templateLoading) return;
    if (recipients.length === 0) {
      notify("Добавьте получателей", "error");
      return;
    }
    if (!templateId && !subject.trim()) {
      notify("Введите тему письма", "error");
      return;
    }
    if (recipients.some((email) => !isValidEmail(email))) {
      notify("Проверьте email получателей", "error");
      return;
    }
    setSending(true);
    try {
      const payload = { recipients, template_id: templateId || null, subject, body, attachment_ids: files.map((f) => f.file_id) };
      const signature = JSON.stringify({ eventId, ...payload });
      if (requestRef.current?.signature !== signature) {
        const key = Array.from(window.crypto.getRandomValues(new Uint8Array(16)), (n) => n.toString(16).padStart(2, "0")).join("");
        requestRef.current = { signature, key };
      }
      await api.sendMail(eventId, { ...payload, idempotency_key: requestRef.current.key });
      notify("Письмо поставлено в очередь", "success");
      navigate(`/events/${eventId}/mail`);
    } catch (error) {
      notify(error.message_ru || "Не удалось отправить письмо", "error");
    } finally {
      setSending(false);
    }
  };

  const usingTemplate = !!templateId;
  const selectedTemplate = useMemo(() => templates.find((t) => String(t.id) === String(templateId)), [templates, templateId]);

  const templateLoading = !!templateId && selectedTemplate?.body === undefined;
  const files = [...(selectedTemplate?.attachments || []).filter((f) => !excluded.includes(f.file_id)), ...manualFiles]
    .filter((file, index, all) => all.findIndex((f) => f.file_id === file.file_id) === index);

  useEffect(() => {
    let cancelled = false;
    if (!templateId || selectedTemplate?.body !== undefined) return;
    api.getTemplate(eventId, templateId).then((template) => {
      if (cancelled) return;
      setTemplates((current) => current.map((item) => String(item.id) === String(template.id) ? template : item));
    }).catch((e) => { if (!cancelled) setTemplateError(e.message_ru || "Не удалось загрузить шаблон. Выберите его повторно."); });
    return () => { cancelled = true; };
  }, [eventId, templateId, selectedTemplate]);

  return (
    <div className="max-w-3xl">
      <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Почта &nbsp;›&nbsp; Написать</div>
      <h1 className="text-3xl font-extrabold mb-6">Новое письмо</h1>

      <div className="surface p-6 space-y-4">
        <div>
          <label className="label">Получатели</label>
          <div
            className="input flex flex-wrap gap-1.5 items-center min-h-[44px] cursor-text"
            onClick={(e) => e.currentTarget.querySelector("input")?.focus()}
          >
            {recipients.map((r) => (
              <span key={r} className="chip chip-brand !py-0.5" data-testid={`recipient-${r}`}>
                {r}
                <button onClick={() => removeRecipient(r)} className="ml-1">
                  <X size={10} />
                </button>
              </span>
            ))}
            <input
              className="bg-transparent outline-none flex-1 min-w-[120px] text-sm"
              placeholder={recipients.length ? "" : "Начните вводить email или имя…"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && query.includes("@")) {
                  addRecipient(query.trim());
                }
              }}
              data-testid="recipient-input"
            />
          </div>
          {(suggestions.length > 0 || (isValidEmail(query.trim()) && !recipients.includes(query.trim().toLowerCase()))) && (
            <div className="mt-1 surface p-1">
              {/* Participant suggestions */}
              {suggestions.map((s) => (
                <button
                  key={s.email}
                  onClick={() => addRecipient(s.email)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-[color:var(--bg-elev-2)] text-sm flex justify-between items-center"
                >
                  <span className="font-medium">{s.name}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>{s.email}</span>
                </button>
              ))}
              
              {/* Custom email option */}
              {isValidEmail(query.trim()) && !recipients.includes(query.trim().toLowerCase()) && (
                <button
                  onClick={() => addRecipient(query.trim())}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-[color:var(--bg-elev-2)] text-sm border-t"
                  style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}
                >
                  <Plus size={12} className="inline-block mr-1 mb-0.5" />
                  Отправить на <span className="font-medium">{query.trim()}</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="label">Шаблон письма</label>
          <select className="input" value={templateId} disabled={sending || uploading} onChange={(e) => { setTemplateId(e.target.value); setExcluded([]); setTemplateError(""); }} data-testid="mail-template-select">
            <option value="">— без шаблона —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {!usingTemplate ? (
          <>
            <div>
              <label className="label">Тема</label>
              <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} data-testid="mail-subject" />
            </div>
            <div>
              <label className="label">Текст</label>
              <ReactQuill theme="snow" value={body} onChange={setBody} modules={quillModules} />
            </div>
          </>
        ) : (
          selectedTemplate && (
            <div className="surface-soft p-4">
              <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Из шаблона «{selectedTemplate.name}»</div>
              <div className="font-semibold mb-2">{selectedTemplate.subject}</div>
              <SafeHtml className="text-sm" html={selectedTemplate.body} />
            </div>
          )
        )}

        {templateError && <p role="alert">{templateError}</p>}
        {templateLoading && <p>Загружаем вложения шаблона…</p>}
        <AttachmentList eventId={eventId} files={files} disabled={sending || uploading}
          onRemove={(id) => { setExcluded((current) => [...current, id]); setManualFiles((current) => current.filter((f) => f.file_id !== id)); }} />
        <FileUploader eventId={eventId} purpose="mail" files={files} disabled={sending || templateLoading}
          onUploaded={(file) => setManualFiles((current) => [...current, file])} onBusyChange={setUploading} />
        <p className="text-sm">Добавленные вручную файлы сохраняются при смене шаблона. Удаление вложения здесь действует только на это письмо.</p>
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>Отмена</button>
          <button className="btn btn-primary" disabled={sending || uploading || templateLoading} onClick={send} data-testid="mail-send-btn">
            {sending ? <span className="spinner" /> : <Send size={14} />} Отправить
          </button>
        </div>
      </div>
    </div>
  );
}
