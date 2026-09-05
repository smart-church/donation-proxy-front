import React, { useEffect, useState } from "react";
import { Plus, X, Mail } from "lucide-react";
import * as api from "../mock/api";
import Modal from "../components/Modal";
import { useApp } from "../components/AppContext";

export default function AdminOrganizers() {
  const [rows, setRows] = useState([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const { notify } = useApp();

  const reload = async () => {
    try {
      const data = await api.listAllOrganizers();
      setRows(data);
    } catch (e) {
      notify(e.message_ru || "Ошибка загрузки", "error");
    }
    setLoading(false);
  };

  useEffect(() => { 
    reload(); 
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
        Администрация › Организаторы
      </div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-extrabold">Организаторы</h1>
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
                    <td className="font-medium">{u.full_name}</td>
                    <td style={{ color: "var(--text-dim)" }}>{u.email}</td>
                    <td>
                      <button
                        className="btn btn-ghost !py-1 !px-2"
                        title="Отправить приглашение"
                        data-testid={`organizers-resend-${u.id}`}
                      >
                        <Mail size={14} />
                      </button>
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
            } catch (e) {
              notify(e.message_ru || "Ошибка при отправке приглашения", "error");
            }
            setOpenAdd(false);
          }}
        />
      )}
    </div>
  );
}

function InviteModal({ onClose, onInvite }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      return;
    }
    setSubmitting(true);
    await onInvite(email);
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
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!email.trim() || submitting}
            data-testid="organizers-invite-submit"
          >
            {submitting ? <span className="spinner" /> : "Отправить приглашение"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          На указанный email будет отправлено приглашение с логином и пароль для входа.
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
            onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
            data-testid="organizers-invite-email"
          />
        </div>
      </div>
    </Modal>
  );
}
