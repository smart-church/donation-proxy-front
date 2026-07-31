import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { User, Mail, Lock, Save, ChevronLeft } from "lucide-react";
import * as api from "../mock/api";
import { useApp } from "../components/AppContext";

export default function Profile() {
  const { id } = useParams();
  const { user, refreshUser, notify } = useApp();
  const [profile, setProfile] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api.getUserById(id).then(setProfile);
  }, [id]);

  if (!profile) return <div className="min-h-screen grid place-items-center"><span className="spinner" /></div>;

  const isMe = user?.id === profile.id;

  const saveProfile = async () => {
    setSavingProfile(true);
    await api.updateProfile({ full_name: profile.full_name, email: profile.email });
    await refreshUser();
    setSavingProfile(false);
    notify("Профиль обновлён", "success");
  };

  const savePw = async () => {
    setPwError("");
    if (!passwords.current || !passwords.next) return setPwError("Заполните все поля");
    if (passwords.next !== passwords.confirm) return setPwError("Пароли не совпадают");
    setSavingPw(true);
    try {
      await api.updatePassword({ current: passwords.current, next: passwords.next });
      setPasswords({ current: "", next: "", confirm: "" });
      notify("Пароль обновлён", "success");
    } catch (e) {
      setPwError(e.message_ru);
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="min-h-screen grain px-6 py-10" style={{ background: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto relative z-10">
        <button className="btn btn-ghost mb-4" onClick={() => navigate("/events")}>
          <ChevronLeft size={14} /> К мероприятиям
        </button>
        <div className="surface p-8 mb-4">
          <div className="flex items-center gap-4 mb-6">
            <div
              className="w-14 h-14 rounded-full grid place-items-center font-bold text-xl"
              style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
            >
              {(profile.full_name || "?").split(" ").map((s) => s[0]).join("").slice(0, 2)}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold">{profile.full_name}</h1>
              <div className="text-sm" style={{ color: "var(--text-dim)" }}>{profile.email}</div>
            </div>
          </div>

          {isMe && (
            <div className="space-y-4">
              <div>
                <label className="label">ФИО</label>
                <input
                  className="input"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  data-testid="profile-full-name"
                />
              </div>
              <div>
                <label className="label">Электронная почта</label>
                <input
                  className="input"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  data-testid="profile-email"
                />
              </div>
              <button onClick={saveProfile} className="btn btn-primary" disabled={savingProfile} data-testid="profile-save">
                {savingProfile ? <span className="spinner" /> : <Save size={14} />} Сохранить
              </button>
            </div>
          )}
        </div>

        {isMe && (
          <div className="surface p-8">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
              Смена пароля
            </h3>
            <div className="space-y-3">
              <div>
                <label className="label">Текущий пароль</label>
                <input
                  type="password"
                  className="input"
                  value={passwords.current}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                  data-testid="pw-current"
                />
              </div>
              <div>
                <label className="label">Новый пароль</label>
                <input
                  type="password"
                  className="input"
                  value={passwords.next}
                  onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
                  data-testid="pw-next"
                />
              </div>
              <div>
                <label className="label">Повторите новый пароль</label>
                <input
                  type="password"
                  className="input"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  data-testid="pw-confirm"
                />
              </div>
              {pwError && <div className="text-xs" style={{ color: "var(--danger)" }}>{pwError}</div>}
              <button className="btn btn-primary" onClick={savePw} disabled={savingPw} data-testid="pw-save">
                {savingPw ? <span className="spinner" /> : <Lock size={14} />} Обновить пароль
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
