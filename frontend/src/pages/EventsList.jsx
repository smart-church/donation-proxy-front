import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Users, CheckCircle2, Clock, XCircle, Plus, ChevronRight } from "lucide-react";
import * as api from "../mock/api";
import { formatDateShort } from "../lib/utils";

function StatCard({ icon: Icon, label, value, kind, testid }) {
  const bg =
    kind === "ok"
      ? "var(--status-ok-bg)"
      : kind === "wait"
      ? "var(--status-wait-bg)"
      : kind === "fail"
      ? "var(--status-fail-bg)"
      : "var(--status-total-bg)";
  const color =
    kind === "ok" ? "var(--brand)" : kind === "wait" ? "var(--warn)" : kind === "fail" ? "var(--danger)" : "var(--text)";
  return (
    <div className="surface px-5 py-4 flex items-center gap-3" data-testid={testid}>
      <div className="w-10 h-10 rounded-lg grid place-items-center" style={{ background: bg, color }}>
        <Icon size={18} strokeWidth={1.8} />
      </div>
      <div className="leading-tight">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</div>
      </div>
    </div>
  );
}

export default function EventsList() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.listEvents().then((data) => {
      setEvents(data);
      setLoading(false);
    });
  }, []);

  const totals = events.reduce(
    (acc, e) => {
      acc.total += e.participants_count || 0;
      return acc;
    },
    { total: 0, ok: 0, wait: 0, fail: 0 }
  );

  return (
    <div className="max-w-6xl">
      <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
        Мероприятия &nbsp;›&nbsp; Список
      </div>
      <div className="flex items-end justify-between mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Мероприятия</h1>
        <button data-testid="events-create-btn" onClick={() => navigate("/events/create")} className="btn btn-primary">
          <Plus size={14} /> Новое мероприятие
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Users} label="Всего" value={totals.total} kind="total" testid="stat-total" />
        <StatCard icon={CheckCircle2} label="Принят" value={totals.ok} kind="ok" testid="stat-ok" />
        <StatCard icon={Clock} label="На проверке" value={totals.wait} kind="wait" testid="stat-wait" />
        <StatCard icon={XCircle} label="Отклонено" value={totals.fail} kind="fail" testid="stat-fail" />
      </div>

      {loading ? (
        <div className="surface p-12 text-center" style={{ color: "var(--text-muted)" }}>
          <span className="spinner" /> Загрузка...
        </div>
      ) : events.length === 0 ? (
        <div className="surface p-16 text-center">
          <Calendar size={40} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <div className="text-lg font-semibold mb-1">Пока нет мероприятий</div>
          <div className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
            Создайте своё первое мероприятие, чтобы начать работу
          </div>
          <button className="btn btn-primary" onClick={() => navigate("/events/create")} data-testid="events-empty-create">
            <Plus size={14} /> Создать мероприятие
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {events.map((ev) => (
            <button
              key={ev.id}
              data-testid={`event-card-${ev.id}`}
              onClick={() => navigate(`/events/${ev.id}/participants`)}
              className="surface p-5 text-left flex items-center justify-between hover:border-[color:var(--brand)] transition-all group"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl grid place-items-center"
                  style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
                >
                  <Calendar size={22} strokeWidth={1.8} />
                </div>
                <div>
                  <div className="text-base font-semibold group-hover:text-[color:var(--brand)] transition-colors">
                    {ev.name}
                  </div>
                  <div className="text-xs flex items-center gap-3 mt-1" style={{ color: "var(--text-muted)" }}>
                    <span>Создано {formatDateShort(ev.created_at)}</span>
                    <span className={`chip ${ev.registration_open ? "chip-brand" : ""}`}>
                      {ev.registration_open ? "Регистрация открыта" : "Регистрация закрыта"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-right">
                  <div className="font-semibold">{ev.participants_count}</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    участников
                  </div>
                </div>
                <ChevronRight size={18} style={{ color: "var(--text-muted)" }} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
