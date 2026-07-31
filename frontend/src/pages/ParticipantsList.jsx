import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Users, CheckCircle2, Clock, XCircle, Download, Plus, Filter, X } from "lucide-react";
import * as XLSX from "xlsx";
import * as api from "../mock/api";
import DataTable from "../components/DataTable";
import { formatDateShort } from "../lib/utils";

function StatCard({ icon: Icon, label, value, kind, testid }) {
  const bg =
    kind === "ok" ? "var(--status-ok-bg)" : kind === "wait" ? "var(--status-wait-bg)" : kind === "fail" ? "var(--status-fail-bg)" : "var(--status-total-bg)";
  const color = kind === "ok" ? "var(--brand)" : kind === "wait" ? "var(--warn)" : kind === "fail" ? "var(--danger)" : "var(--text)";
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

const statusChip = (s) => {
  const map = {
    accepted: { cls: "status-accepted", text: "Принят", icon: CheckCircle2 },
    pending: { cls: "status-pending", text: "На проверке", icon: Clock },
    rejected: { cls: "status-rejected", text: "Отклонён", icon: XCircle },
  };
  const it = map[s] || map.pending;
  const Icon = it.icon;
  return (
    <span className={`status ${it.cls}`}>
      <Icon size={11} /> {it.text}
    </span>
  );
};

export default function ParticipantsList() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fields: [] });
  const [participants, setParticipants] = useState([]);
  const [selectedCols, setSelectedCols] = useState(() => ["email", "status"]);
  const [colFilters, setColFilters] = useState({});
  const [pendingFilter, setPendingFilter] = useState({ col: null, val: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [f, p] = await Promise.all([api.getForm(eventId), api.listParticipants(eventId)]);
      setForm(f);
      setParticipants(p);
      setLoading(false);
    })();
  }, [eventId]);

  const dynamicCols = useMemo(() => {
    const base = [
      { id: "email", label: "Почта", value: (p) => p.email },
      { id: "status", label: "Статус анкеты", value: (p) => statusMap(p.status), raw: (p) => p.status },
    ];
    const extra = form.fields
      .filter((f) => f.type !== "full_name" && f.type !== "email" && f.type !== "filler")
      .map((f) => ({ id: f.id, label: f.title, value: (p) => renderAnswer(p.answers?.[f.id]) }));
    return [...base, ...extra];
  }, [form]);

  const stats = useMemo(() => {
    const total = participants.length;
    const ok = participants.filter((p) => p.status === "accepted").length;
    const wait = participants.filter((p) => p.status === "pending").length;
    const fail = participants.filter((p) => p.status === "rejected").length;
    return { total, ok, wait, fail };
  }, [participants]);

  const filteredRows = useMemo(() => {
    return participants.filter((p) => {
      return Object.entries(colFilters).every(([col, val]) => {
        if (!val) return true;
        const c = dynamicCols.find((x) => x.id === col);
        if (!c) return true;
        const v = String(c.value(p) ?? "").toLowerCase();
        return v.includes(String(val).toLowerCase());
      });
    });
  }, [participants, colFilters, dynamicCols]);

  const tableColumns = useMemo(() => {
    const cols = [
      {
        key: "num",
        label: "#",
        width: "60px",
        render: (_, i) => <span style={{ color: "var(--text-muted)" }}>{i + 1}</span>,
      },
      {
        key: "full_name",
        label: "ФИО",
        sortable: true,
        value: (p) => p.full_name || "—",
        render: (p) => (
          <button
            data-testid={`participant-link-${p.id}`}
            onClick={() => navigate(`/participant/${p.id}?event=${eventId}`)}
            className="link font-medium"
          >
            {p.full_name || "—"}
          </button>
        ),
      },
    ];
    selectedCols.forEach((cid) => {
      const c = dynamicCols.find((x) => x.id === cid);
      if (!c) return;
      cols.push({
        key: c.id,
        label: c.label,
        render: (p) => (c.id === "status" ? statusChip(p.status) : c.value(p) || "—"),
      });
    });
    return cols;
  }, [selectedCols, dynamicCols, navigate, eventId]);

  const toggleCol = (id) => {
    setSelectedCols((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const exportXlsx = () => {
    const rows = filteredRows.map((p, i) => {
      const row = { "#": i + 1, "ФИО": p.full_name, "Почта": p.email, "Статус": statusMap(p.status) };
      selectedCols.forEach((cid) => {
        if (cid === "email" || cid === "status") return;
        const c = dynamicCols.find((x) => x.id === cid);
        if (c) row[c.label] = c.value(p);
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Участники");
    XLSX.writeFile(wb, `participants-${eventId}.xlsx`);
  };

  const applyFilter = () => {
    if (!pendingFilter.col) return;
    setColFilters((f) => ({ ...f, [pendingFilter.col]: pendingFilter.val }));
    setPendingFilter({ col: null, val: "" });
  };
  const clearFilter = (col) => {
    setColFilters((f) => {
      const n = { ...f };
      delete n[col];
      return n;
    });
  };

  return (
    <div className="max-w-[1200px]">
      <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
        Список &nbsp;›&nbsp; Участники
      </div>

      {/* Column selectors */}
      <div className="flex flex-wrap items-center gap-2 mb-5" data-testid="participants-columns">
        <div
          className="w-9 h-9 rounded-lg grid place-items-center"
          style={{ background: "var(--bg-elev-2)", color: "var(--text-dim)" }}
        >
          <Filter size={14} />
        </div>
        {dynamicCols.map((c) => {
          const selected = selectedCols.includes(c.id);
          const filtered = !!colFilters[c.id];
          const pending = pendingFilter.col === c.id;
          return (
            <div key={c.id} className="relative">
              <button
                data-testid={`col-toggle-${c.id}`}
                onClick={() => toggleCol(c.id)}
                onDoubleClick={() => setPendingFilter({ col: c.id, val: colFilters[c.id] || "" })}
                className={`chip transition-all ${selected ? "chip-brand" : ""}`}
                style={filtered ? { boxShadow: "inset 0 0 0 1px var(--brand)" } : {}}
              >
                {c.label}
                {filtered && (
                  <X
                    size={10}
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFilter(c.id);
                    }}
                  />
                )}
              </button>
              {pending && (
                <div className="absolute top-full left-0 mt-1 z-20 surface p-2 flex gap-2 shadow-soft" data-testid={`col-filter-${c.id}`}>
                  <input
                    autoFocus
                    className="input !py-1 !text-xs w-40"
                    value={pendingFilter.val}
                    onChange={(e) => setPendingFilter((p) => ({ ...p, val: e.target.value }))}
                    placeholder={`Фильтр по ${c.label}`}
                  />
                  <button className="btn btn-primary !py-1 !text-xs" onClick={applyFilter} data-testid={`col-filter-apply-${c.id}`}>
                    Применить
                  </button>
                  <button className="btn btn-ghost !py-1 !text-xs" onClick={() => setPendingFilter({ col: null, val: "" })}>
                    ✕
                  </button>
                </div>
              )}
            </div>
          );
        })}
        <div className="text-[11px] ml-2" style={{ color: "var(--text-muted)" }}>
          Клик — вкл/выкл столбец • двойной клик — фильтр
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Users} label="Всего" value={stats.total} kind="total" testid="stat-total" />
        <StatCard icon={CheckCircle2} label="Принят" value={stats.ok} kind="ok" testid="stat-ok" />
        <StatCard icon={Clock} label="На проверке" value={stats.wait} kind="wait" testid="stat-wait" />
        <StatCard icon={XCircle} label="Отклонено" value={stats.fail} kind="fail" testid="stat-fail" />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold flex items-baseline gap-2">
          Участники <span className="text-sm font-normal" style={{ color: "var(--text-muted)" }}>{filteredRows.length}</span>
        </h2>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost" onClick={exportXlsx} data-testid="participants-export">
            <Download size={14} /> Скачать таблицу
          </button>
          <button className="btn btn-primary" data-testid="participants-add">
            <Plus size={14} /> Добавить участника
          </button>
        </div>
      </div>

      {loading ? (
        <div className="surface p-12 text-center" style={{ color: "var(--text-muted)" }}>
          <span className="spinner" /> Загрузка...
        </div>
      ) : (
        <DataTable
          columns={tableColumns}
          rows={filteredRows}
          testid="participants-table"
          emptyText="В таблице отсутствуют данные"
        />
      )}
    </div>
  );
}

function statusMap(s) {
  return s === "accepted" ? "Принят" : s === "rejected" ? "Отклонён" : "На проверке";
}

function renderAnswer(v) {
  if (v == null) return "—";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}
