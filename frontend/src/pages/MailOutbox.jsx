import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Send, ChevronLeft } from "lucide-react";
import * as api from "../mock/api";
import DataTable from "../components/DataTable";
import SafeHtml from "../components/SafeHtml";
import { formatDateFull, formatDateShort } from "../lib/utils";

export function MailOutbox() {
  const { eventId } = useParams();
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.listMail(eventId).then(setRows);
  }, [eventId]);

  if (selected) return <MailView eventId={eventId} mail={selected} onBack={() => setSelected(null)} />;

  const columns = [
    { key: "num", label: "#", width: "60px", render: (_, i) => i + 1 },
    {
      key: "subject",
      label: "Тема",
      sortable: true,
      render: (m) => (
        <button className="link font-medium" onClick={() => setSelected(m)} data-testid={`mail-open-${m.id}`}>
          {m.subject || "(без темы)"}
        </button>
      ),
    },
    { key: "recipients", label: "Получатель", render: (m) => (m.recipients || []).join(", ") },
    { key: "sent_at", label: "Дата", render: (m) => formatDateShort(m.sent_at) },
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

function MailView({ eventId, mail, onBack }) {
  return (
    <div className="max-w-3xl">
      <button className="btn btn-ghost mb-4" onClick={onBack}>
        <ChevronLeft size={14} /> К списку
      </button>
      <div className="surface p-8">
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>{formatDateFull(mail.sent_at)}</div>
        <h1 className="text-2xl font-extrabold mt-2 mb-1">{mail.subject}</h1>
        <div className="text-sm mb-6" style={{ color: "var(--text-dim)" }}>
          Кому: {(mail.recipients || []).join(", ")}
        </div>
        <div className="prose prose-sm max-w-none">
          <SafeHtml html={mail.body} />
        </div>
      </div>
    </div>
  );
}
