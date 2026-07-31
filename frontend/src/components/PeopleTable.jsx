import React, { useEffect, useState } from "react";
import { Plus, X, Search, Shield } from "lucide-react";
import * as api from "../mock/api";
import Modal from "../components/Modal";
import { useApp } from "../components/AppContext";

// Shared people list used by Managers (event-scoped) and Admins (global).
export default function PeopleTable({
  title,
  breadcrumb,
  fetchList,
  fetchSearch,
  addFn,
  removeFn,
  testidPrefix,
}) {
  const [rows, setRows] = useState([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const { notify } = useApp();

  const reload = () => fetchList().then(setRows);
  useEffect(() => { reload(); }, [fetchList]);

  return (
    <div className="max-w-4xl">
      <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{breadcrumb}</div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-extrabold">{title}</h1>
        <button className="btn btn-primary" onClick={() => setOpenAdd(true)} data-testid={`${testidPrefix}-add-btn`}>
          <Plus size={14} /> Добавить
        </button>
      </div>

      <div className="surface overflow-hidden">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 60 }}>#</th>
              <th>ФИО</th>
              <th>Email</th>
              <th style={{ width: 80 }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12" style={{ color: "var(--text-muted)" }}>
                  Пока никого нет
                </td>
              </tr>
            ) : (
              rows.map((u, i) => (
                <tr key={u.id}>
                  <td>{i + 1}</td>
                  <td className="font-medium flex items-center gap-2">
                    {u.full_name}
                    {u.is_superuser && (
                      <span className="chip chip-brand">
                        <Shield size={10} /> superuser
                      </span>
                    )}
                  </td>
                  <td style={{ color: "var(--text-dim)" }}>{u.email}</td>
                  <td>
                    <button
                      onClick={() => setConfirmRemove(u)}
                      className="btn btn-ghost !py-1 !px-2"
                      disabled={u.is_superuser}
                      title={u.is_superuser ? "Нельзя удалить суперпользователя" : "Удалить"}
                      data-testid={`${testidPrefix}-remove-${u.id}`}
                    >
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {openAdd && (
        <AddPeopleModal
          onClose={() => setOpenAdd(false)}
          onAdd={async (userId) => {
            try {
              await addFn(userId);
              await reload();
              notify("Добавлено", "success");
            } catch (e) {
              notify(e.message_ru, "error");
            }
            setOpenAdd(false);
          }}
          fetchSearch={fetchSearch}
          testidPrefix={testidPrefix}
        />
      )}

      <Modal
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        title="Удалить пользователя?"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setConfirmRemove(null)}>Отмена</button>
            <button
              className="btn btn-danger"
              onClick={async () => {
                try {
                  await removeFn(confirmRemove.id);
                  await reload();
                  notify("Удалено", "success");
                } catch (e) {
                  notify(e.message_ru, "error");
                }
                setConfirmRemove(null);
              }}
              data-testid={`${testidPrefix}-confirm-remove`}
            >
              Удалить
            </button>
          </>
        }
      >
        {confirmRemove && (
          <p className="text-sm">
            Пользователь <b>{confirmRemove.full_name}</b> будет удалён из списка.
          </p>
        )}
      </Modal>
    </div>
  );
}

function AddPeopleModal({ onClose, onAdd, fetchSearch, testidPrefix }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    fetchSearch(q).then(setResults);
  }, [q, fetchSearch]);

  return (
    <Modal open onClose={onClose} title="Добавить пользователя" size="md" testid={`${testidPrefix}-add-modal`}>
      <div className="relative mb-3">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
        <input
          autoFocus
          className="input pl-8"
          placeholder="Поиск по имени или email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          data-testid={`${testidPrefix}-add-search`}
        />
      </div>
      <div className="space-y-1 max-h-72 overflow-y-auto">
        {results.map((u) => (
          <button
            key={u.id}
            onClick={() => onAdd(u.id)}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-[color:var(--bg-elev-2)] flex items-center justify-between text-sm"
            data-testid={`${testidPrefix}-add-pick-${u.id}`}
          >
            <span className="font-medium">{u.full_name}</span>
            <span style={{ color: "var(--text-muted)" }}>{u.email}</span>
          </button>
        ))}
        {results.length === 0 && (
          <div className="text-center py-6 text-sm" style={{ color: "var(--text-muted)" }}>
            Никого не найдено
          </div>
        )}
      </div>
    </Modal>
  );
}
