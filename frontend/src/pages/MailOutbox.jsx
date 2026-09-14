import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Send, ChevronLeft } from "lucide-react";
import * as api from "../mock/api";
import AttachmentList from "../components/AttachmentList";
import DataTable from "../components/DataTable";
import SafeHtml from "../components/SafeHtml";
import { formatDateFull, formatDateShort } from "../lib/utils";

const statusLabel = (m) => ({ queued: "В очереди", sending: "Отправляется", sent: "Принято SMTP", failed: "Ошибка" }[m.status] || (m.is_sent ? "Принято SMTP" : "В очереди"));

export function MailOutbox() {
  const { eventId } = useParams();
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const reload = () => api.listMail(eventId).then((data) => { if (!cancelled) setRows(data); }).catch(() => {});
    reload();
    const timer = setInterval(reload, 5000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [eventId]);

  if (selected) return <MailView eventId={eventId} mail={selected} onBack={() => setSelected(null)} />;

  const columns = [
    { key: "num", label: "#", width: "60px", render: (_, i) => i + 1 },
    {
      key: "subject",
      label: "Тема",
      sortable: true,
      render: (m) => (
        <button className="link font-medium" onClick={async () => setSelected(await api.getMailItem(eventId, m.id))} data-testid={`mail-open-${m.id}`}>
          {m.subject || "(без темы)"}
        </button>
      ),
    },
    { key: "recipients", label: "Получатель", render: (m) => (m.recipients || []).join(", ") },
    { key: "status", label: "Статус", render: statusLabel },
    { key: "date", label: "Создано", render: (m) => formatDateShort(m.date) },
  ];

  return (
    <div className="max-w-6xl">
      <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Почта &nbsp;›&nbsp; Исходящие</div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-extrabold">Исходящие</h1>
        <button onClick={() => navigate(`/events/${eventId}/mail/create`)} className="btn btn-primary">
          <Send size={14} /> Написать
        </button>
      </div>
      <DataTable columns={columns} rows={rows} testid="mail-outbox-table" />
    </div>
  );
}

function MailView({ eventId, mail: initialMail, onBack }) {
  const [mail, setMail] = useState(initialMail);
  useEffect(() => {
    let cancelled = false;
    const timer = setInterval(() => api.getMailItem(eventId, initialMail.id)
      .then((data) => { if (!cancelled) setMail(data); }).catch(() => {}), 5000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [eventId, initialMail.id]);
  return (
    <div className="max-w-3xl">
      <button className="btn btn-ghost mb-4" onClick={onBack}>
        <ChevronLeft size={14} /> К списку
      </button>
      <div className="surface p-8">
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>{formatDateFull(mail.date)}</div>
        <p>{statusLabel(mail)} · Попыток: {mail.attempts || 0}</p>
        {mail.sent_at && <p>Принято SMTP: {formatDateFull(mail.sent_at)}</p>}
        {mail.last_attempt_at && <p>Последняя попытка: {formatDateFull(mail.last_attempt_at)}</p>}
        {mail.error && <p role="alert">{mail.error}</p>}
        {mail.next_attempt_at && mail.status === "failed" && <p>Повтор после: {formatDateFull(mail.next_attempt_at)}</p>}
        <p className="text-sm">Принятие SMTP не гарантирует доставку во входящие.</p>
        <h1 className="text-2xl font-extrabold mt-2 mb-1">{mail.subject}</h1>
        <div className="text-sm mb-6" style={{ color: "var(--text-dim)" }}>
          Кому: {(mail.recipients || []).join(", ")}
        </div>
        <div className="prose prose-sm max-w-none">
          <SafeHtml html={mail.body} />
          <AttachmentList eventId={eventId} files={mail.attachments || []} />
        </div>
      </div>
    </div>
  );
}
