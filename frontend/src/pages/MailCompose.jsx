import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import ReactQuill from "react-quill";
import { Send, X, Plus } from "lucide-react";
import * as api from "../mock/api";
import SafeHtml from "../components/SafeHtml";
import { useApp } from "../components/AppContext";

const quillModules = {
  toolbar: [["bold", "italic", "underline"], [{ list: "ordered" }, { list: "bullet" }], ["link"], ["clean"]],
};

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
    setRecipients((r) => (r.includes(email) ? r : [...r, email]));
    setQuery("");
  };
  const removeRecipient = (email) => setRecipients((r) => r.filter((x) => x !== email));

  const send = async () => {
    if (recipients.length === 0) {
      notify("Добавьте получателей", "error");
      return;
    }
    if (!templateId && !subject.trim()) {
      notify("Введите тему письма", "error");
      return;
    }
    setSending(true);
    await api.sendMail(eventId, { recipients, template_id: templateId || null, subject, body });
    setSending(false);
    notify("Письмо отправлено (mock)", "success");
    navigate(`/events/${eventId}/mail`);
  };

  const usingTemplate = !!templateId;
  const selectedTemplate = useMemo(() => templates.find((t) => t.id === templateId), [templates, templateId]);

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
          {suggestions.length > 0 && (
            <div className="mt-1 surface p-1">
              {suggestions.map((s) => (
                <button
                  key={s.email}
                  onClick={() => addRecipient(s.email)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-[color:var(--bg-elev-2)] text-sm flex justify-between"
                >
                  <span className="font-medium">{s.name}</span>
                  <span style={{ color: "var(--text-muted)" }}>{s.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="label">Шаблон письма</label>
          <select className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)} data-testid="mail-template-select">
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

        <div className="flex justify-end gap-2 pt-2">
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>Отмена</button>
          <button className="btn btn-primary" disabled={sending} onClick={send} data-testid="mail-send-btn">
            {sending ? <span className="spinner" /> : <Send size={14} />} Отправить
          </button>
        </div>
      </div>
    </div>
  );
}
