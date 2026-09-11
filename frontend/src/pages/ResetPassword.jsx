import React, { useState } from "react";
import { Calendar, Check, Lock } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import * as api from "../mock/api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!uid || !token) {
      setError("Ссылка приглашения неполная или повреждена.");
      return;
    }
    if (password !== confirmation) {
      setError("Пароли не совпадают.");
      return;
    }

    setSubmitting(true);
    try {
      await api.acceptInvite({
        uid,
        token,
        new_password: password,
        new_password_confirm: confirmation,
      });
      setCompleted(true);
    } catch (requestError) {
      setError(requestError.message_ru || "Не удалось установить пароль.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-6 grain" style={{ background: "var(--bg)" }}>
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(1000px 500px at 20% -10%, var(--brand-soft), transparent 60%)" }}
      />
      <div className="w-full max-w-md relative z-10">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 rounded-lg grid place-items-center" style={{ background: "var(--brand)", color: "#04120b" }}>
            <Calendar size={20} strokeWidth={2.4} />
          </div>
          <div className="font-extrabold text-2xl tracking-tight">
            ev<span style={{ color: "var(--brand)" }}>man</span>
          </div>
        </div>

        <div className="surface p-8 shadow-soft">
          {completed ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full grid place-items-center mx-auto mb-4" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}>
                <Check size={26} />
              </div>
              <h1 className="text-xl font-bold mb-2">Пароль установлен</h1>
              <p className="text-sm mb-6" style={{ color: "var(--text-dim)" }}>
                Теперь можно войти, используя email из приглашения и новый пароль.
              </p>
              <Link to="/login" className="btn btn-primary w-full">Перейти ко входу</Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold mb-1.5">Установка пароля</h1>
              <p className="text-sm mb-6" style={{ color: "var(--text-dim)" }}>
                Придумайте пароль для завершения регистрации.
              </p>
              <form onSubmit={submit} className="space-y-4" data-testid="reset-password-form">
                <PasswordField
                  label="Новый пароль"
                  value={password}
                  onChange={(value) => { setPassword(value); setError(""); }}
                  testid="reset-password-new"
                />
                <PasswordField
                  label="Повторите пароль"
                  value={confirmation}
                  onChange={(value) => { setConfirmation(value); setError(""); }}
                  testid="reset-password-confirm"
                />
                {error && <div role="alert" className="text-sm" style={{ color: "var(--danger)" }}>{error}</div>}
                <button className="btn btn-primary w-full" disabled={submitting || password.length < 8 || confirmation.length < 8}>
                  {submitting ? <span className="spinner" /> : <Check size={14} />}
                  Установить пароль
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, testid }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
        <input
          data-testid={testid}
          type="password"
          minLength={8}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="input pl-9"
          placeholder="Не менее 8 символов"
        />
      </div>
    </div>
  );
}
