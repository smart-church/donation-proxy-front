import React, { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import * as api from "../mock/api";
import Modal from "../components/Modal";
import { useApp } from "../components/AppContext";

export default function AdminOrganizers() {
  const [rows, setRows] = useState([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const { notify } = useApp();

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listUsers();
      setRows(data);
    } catch (e) {
      notify(e.message_ru || "Ошибка загрузки", "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <div className="max-w-4xl">
      <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
        Администрация › Пользователи
      </div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-extrabold">Пользователи</h1>
        <button 
          className="btn btn-primary" 
          onClick={() => setOpenAdd(true)} 
          data-testid="organizers-add-btn"
        >
          <Plus size={14} /> Добавить
        </button>
      </div>

      {loading ? (
        <div className="surface p-12 text-center" style={{ color: "var(--text-muted)" }}>
          <span className="spinner" /> Загрузка…
        </div>
      ) : (
        <div className="surface overflow-hidden">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 60 }}>#</th>
                <th>ФИО</th>
                <th>Email</th>
                <th>Роль</th>
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
                    <td className="font-medium">{u.full_name || "—"}</td>
                    <td style={{ color: "var(--text-dim)" }}>{u.email}</td>
                    <td style={{ color: "var(--text-dim)" }}>
                      {u.is_superuser ? "Суперпользователь" : u.is_admin ? "Администратор" : "Организатор"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {openAdd && (
        <InviteModal
          onClose={() => setOpenAdd(false)}
          onInvite={async (email) => {
            try {
              await api.inviteOrganizer(email);
              await reload();
              notify("Приглашение отправлено на почту", "success");
              setOpenAdd(false);
              return null;
            } catch (e) {
              const message = e.message_ru || "Ошибка при отправке приглашения";
              notify(message, "error");
              return message;
            }
          }}
        />
      )}
    </div>
  );
}

function InviteModal({ onClose, onInvite }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event?.preventDefault();
    if (!email.trim()) {
      return;
    }
    setError("");
    setSubmitting(true);
    const invitationError = await onInvite(email.trim().toLowerCase());
    if (invitationError) setError(invitationError);
    setSubmitting(false);
  };

  return (
    <Modal 
      open 
      onClose={onClose} 
      title="Пригласить организатора" 
      size="sm" 
      testid="organizers-invite-modal"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
          <button
            type="submit"
            form="organizer-invite-form"
            className="btn btn-primary"
            disabled={!email.trim() || submitting}
            data-testid="organizers-invite-submit"
          >
            {submitting ? <span className="spinner" /> : "Отправить приглашение"}
          </button>
        </>
      }
    >
      <form id="organizer-invite-form" className="space-y-3" onSubmit={handleSubmit}>
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          На указанный email будет отправлен логин и одноразовая ссылка для установки пароля.
        </p>
        <div>
          <label className="label">Email организатора</label>
          <input
            autoFocus
            type="email"
            className="input"
            placeholder="organizer@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="organizers-invite-email"
          />
        </div>
        {error && <div role="alert" className="text-sm" style={{ color: "var(--danger)" }}>{error}</div>}
      </form>
    </Modal>
  );
}
