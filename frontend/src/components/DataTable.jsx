import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

// Reusable data table with search, pagination and page size.
export default function DataTable({
  columns,
  rows,
  emptyText = "В таблице отсутствуют данные",
  initialPageSize = 10,
  searchable = true,
  testid = "data-table",
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sort, setSort] = useState({ key: null, dir: "asc" });

  const filtered = useMemo(() => {
    if (!q) return rows;
    const lc = q.toLowerCase();
    return rows.filter((r) =>
      columns.some((c) => String(c.value ? c.value(r) : r[c.key] ?? "").toLowerCase().includes(lc))
    );
  }, [q, rows, columns]);

  const sorted = useMemo(() => {
    if (!sort.key) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    const arr = [...filtered];
    arr.sort((a, b) => {
      const va = String(col.value ? col.value(a) : a[sort.key] ?? "");
      const vb = String(col.value ? col.value(b) : b[sort.key] ?? "");
      return sort.dir === "asc" ? va.localeCompare(vb, "ru") : vb.localeCompare(va, "ru");
    });
    return arr;
  }, [filtered, sort, columns]);

  const total = sorted.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * pageSize;
  const paged = sorted.slice(start, start + pageSize);

  const toggleSort = (key, sortable) => {
    if (!sortable) return;
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  };

  return (
    <div className="surface overflow-hidden" data-testid={testid}>
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-dim)" }}>
          <span>Показать</span>
          <select
            data-testid={`${testid}-page-size`}
            value={pageSize}
            onChange={(e) => setPageSize(parseInt(e.target.value))}
            className="input !py-1 !w-16 !text-xs"
          >
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={20}>20</option>
          </select>
          <span>записей</span>
        </div>
        {searchable && (
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
            <input
              data-testid={`${testid}-search`}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Поиск..."
              className="input !py-1.5 !pl-8 !text-xs w-56"
            />
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c.key, c.sortable)}
                  style={{ cursor: c.sortable ? "pointer" : "default", width: c.width }}
                >
                  <div className="flex items-center gap-1">
                    {c.label}
                    {c.sortable && sort.key === c.key && (
                      <span style={{ color: "var(--brand)" }}>{sort.dir === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-16" style={{ color: "var(--text-muted)" }}>
                  {emptyText}
                </td>
              </tr>
            ) : (
              paged.map((row, i) => (
                <tr key={row.id || i}>
                  {columns.map((c) => (
                    <td key={c.key}>
                      {c.render ? c.render(row, start + i) : c.value ? c.value(row) : row[c.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div
        className="px-4 py-3 border-t flex items-center justify-between text-xs"
        style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}
      >
        <div data-testid={`${testid}-info`}>
          Записи с {total === 0 ? 0 : start + 1} до {Math.min(start + pageSize, total)} из {total} записей
        </div>
        <div className="flex items-center gap-1">
          <button
            data-testid={`${testid}-prev`}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="btn btn-ghost !py-1 !px-2 !text-xs"
          >
            <ChevronLeft size={12} /> Предыдущая
          </button>
          {Array.from({ length: pages }).slice(0, 7).map((_, idx) => {
            const n = idx + 1;
            return (
              <button
                key={n}
                data-testid={`${testid}-page-${n}`}
                onClick={() => setPage(n)}
                className={`btn !py-1 !px-2.5 !text-xs ${currentPage === n ? "btn-primary" : "btn-ghost"}`}
              >
                {n}
              </button>
            );
          })}
          <button
            data-testid={`${testid}-next`}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={currentPage === pages}
            className="btn btn-ghost !py-1 !px-2 !text-xs"
          >
            Следующая <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
