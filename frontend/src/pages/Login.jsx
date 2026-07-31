import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, LogIn, Mail, Lock } from "lucide-react";
import * as api from "../mock/api";
import { useApp } from "../components/AppContext";

export default function LoginPage() {
  const [email, setEmail] = useState(process.env.REACT_APP_SEED_ADMIN_EMAIL || "admin@evman.io");
  const [password, setPassword] = useState(process.env.REACT_APP_SEED_ADMIN_PASSWORD || "admin1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { refreshUser } = useApp();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.login({ email, password });
      await refreshUser();
      navigate("/events");
    } catch (err) {
      setError(err.message_ru || "Неверные данные");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen grid place-items-center px-6 grain"
      style={{ background: "var(--bg)" }}
    >
      {/* Decorative background */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(1000px 500px at 20% -10%, var(--brand-soft), transparent 60%), radial-gradient(800px 400px at 90% 110%, var(--brand-soft), transparent 60%)",
        }}
      />
      <div className="w-full max-w-md relative z-10">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div
            className="w-9 h-9 rounded-lg grid place-items-center"
            style={{ background: "var(--brand)", color: "#04120b" }}
          >
            <Calendar size={20} strokeWidth={2.4} />
          </div>
          <div className="font-extrabold text-2xl tracking-tight">
            ev<span style={{ color: "var(--brand)" }}>man</span>
          </div>
        </div>

        <div className="surface p-8 shadow-soft">
          <h1 className="text-xl font-bold mb-1.5">Авторизация</h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-dim)" }}>
            Войдите, чтобы управлять мероприятиями
          </p>
          <form onSubmit={submit} className="space-y-4" data-testid="login-form">
            <div>
              <label className="label">Электронная почта</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                <input
                  data-testid="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  className={`input pl-9 ${error ? "error" : ""}`}
                  placeholder="you@evman.io"
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">Пароль</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                <input
                  data-testid="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  className={`input pl-9 ${error ? "error" : ""}`}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            {error && (
              <div className="text-sm" style={{ color: "var(--danger)" }} data-testid="login-error">
                {error}
              </div>
            )}
            <button data-testid="login-submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? <span className="spinner" /> : <LogIn size={14} />}
              Войти
            </button>
          </form>

          <div
            className="mt-6 pt-4 border-t text-xs"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            Тестовые доступы:
            <div className="mt-1 grid grid-cols-2 gap-2">
              <span className="kbd">admin@evman.io / admin1234</span>
              <span className="kbd">manager@evman.io / manager1234</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
