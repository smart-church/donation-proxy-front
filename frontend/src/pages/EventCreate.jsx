import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import * as api from "../mock/api";

export default function EventCreate() {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Введите название мероприятия");
      return;
    }
    setLoading(true);
    try {
      const { id } = await api.createEvent({ name });
      navigate(`/events/${id}/edit`);
    } catch (err) {
      setError(err.message_ru);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
        Мероприятия &nbsp;›&nbsp; Создать
      </div>

      <div className="surface p-10 shadow-soft">
        <div
          className="w-11 h-11 rounded-xl grid place-items-center mb-4"
          style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
        >
          <Sparkles size={22} strokeWidth={1.8} />
        </div>
        <h1 className="text-2xl font-extrabold mb-2">Создание мероприятия</h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-dim)" }}>
          Дайте мероприятию понятное название. Все остальные параметры вы сможете настроить на следующем шаге.
        </p>

        <form onSubmit={submit} className="space-y-4" data-testid="event-create-form">
          <div>
            <label className="label">Название мероприятия</label>
            <input
              data-testid="event-create-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="Например: Летний Хакатон 2026"
              className={`input ${error ? "error" : ""}`}
            />
            {error && (
              <div className="mt-2 text-xs" style={{ color: "var(--danger)" }} data-testid="event-create-error">
                {error}
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <button data-testid="event-create-submit" disabled={loading} className="btn btn-primary">
              {loading ? <span className="spinner" /> : null}
              Создать
            </button>
            <button
              type="button"
              onClick={() => navigate("/events")}
              className="btn btn-ghost"
              data-testid="event-create-cancel"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
