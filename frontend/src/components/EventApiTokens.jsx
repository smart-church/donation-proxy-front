import React, { useEffect, useState } from "react";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import * as api from "../mock/api";
import Modal from "./Modal";
import { formatDateInput, parseLocalDate, toLocalDate } from "../lib/dateInput";

function initialExpiry() {
  const date = new Date();
  date.setDate(date.getDate() + 90);
  return toLocalDate(date);
}

const dateLabel = (value) => value ? toLocalDate(new Date(value)) : "Без срока";
const statusLabels = { active: "Действует", expired: "Истёк", revoked: "Отозван", disabled: "Отключён" };

export default function EventApiTokens({ eventId }) {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [name, setName] = useState("");
  const [expires, setExpires] = useState(initialExpiry);
  const [errors, setErrors] = useState({});
  const [creating, setCreating] = useState(false);
  const [issued, setIssued] = useState(null);
  const [copyMessage, setCopyMessage] = useState("");
  const [revokeToken, setRevokeToken] = useState(null);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState("");
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    api.listEventApiTokens(eventId).then((rows) => {
      if (!cancelled) setTokens(rows);
    }).catch((error) => {
      if (!cancelled) setLoadError(error.message_ru || "Не удалось загрузить API-токены.");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [eventId, refresh]);

  const create = async (event) => {
    event.preventDefault();
    if (creating) return;
    const nextErrors = {};
    if (!name.trim()) nextErrors.name = "Введите название токена.";
    const date = parseLocalDate(expires);
    if (!date) {
      nextErrors.expires_at = "Введите дату в формате дд/мм/гггг.";
    } else if (date.getTime() <= Date.now()) {
      nextErrors.expires_at = "Укажите дату в будущем.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setCreating(true);
    try {
      const result = await api.createEventApiToken(eventId, { name: name.trim(), expires_at: date.toISOString() });
      // The secret lives only in the one-time dialog, never in the token list/storage.
      setTokens((rows) => [result.token, ...rows]);
      setIssued(result);
      setCopyMessage("");
      setName("");
    } catch (error) {
      setErrors({ ...error.field_errors, general: error.message_ru || "Не удалось создать токен." });
    } finally {
      setCreating(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(issued.secret);
      setCopyMessage("Токен скопирован.");
    } catch {
      setCopyMessage("Выделите токен и скопируйте вручную.");
    }
  };

  const revoke = async () => {
    if (revoking) return;
    setRevoking(true);
    setRevokeError("");
    try {
      await api.revokeEventApiToken(eventId, revokeToken.id);
      setTokens((rows) => rows.map((token) => token.id === revokeToken.id
        ? { ...token, status: "revoked", revoked_at: new Date().toISOString() } : token));
      setRevokeToken(null);
    } catch (error) {
      setRevokeError(error.message_ru || "Не удалось отозвать токен.");
    } finally {
      setRevoking(false);
    }
  };

  const closeSecret = () => { setIssued(null); setCopyMessage(""); };

  return (
    <section className="surface p-6 mb-6" aria-labelledby="event-api-tokens-title" data-testid="event-api-tokens">
      <h2 id="event-api-tokens-title" className="text-lg font-bold flex items-center gap-2"><KeyRound size={18} /> API-токены</h2>
      <p className="text-sm mt-2 mb-5" style={{ color: "var(--text-muted)" }}>
        Подключите Telegram-бота или другой сервис. Токен разрешает получать анкету, отправлять регистрации,
        загружать файлы и проверять статус участников только этого мероприятия.
      </p>
      {loading && <p role="status" className="text-sm">Загрузка токенов…</p>}
      {loadError && <div role="alert" className="text-sm mb-4" style={{ color: "var(--danger)" }}>
        {loadError} <button type="button" className="btn btn-ghost" onClick={() => setRefresh((value) => value + 1)}>Повторить</button>
      </div>}
      {!loading && !loadError && tokens.length === 0 && <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>API-токенов пока нет.</p>}
      {!loading && !loadError && tokens.length > 0 && <div className="overflow-x-auto mb-5">
        <table className="w-full text-sm text-left">
          <thead><tr><th className="py-2 pr-3">Название</th><th className="py-2 pr-3">Перестаёт работать</th><th className="py-2 pr-3">Статус</th><th><span className="sr-only">Действия</span></th></tr></thead>
          <tbody>{tokens.map((token) => {
            const status = token.status === "active" && token.expires_at && new Date(token.expires_at).getTime() <= now ? "expired" : token.status;
            return <tr key={token.id} className="border-t" style={{ borderColor: "var(--border)" }} data-testid={`api-token-row-${token.id}`}>
              <td className="py-3 pr-3"><div className="font-semibold break-words">{token.name || "API-токен"}</div><div className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{token.prefix}</div></td>
              <td className="py-3 pr-3 whitespace-nowrap">{dateLabel(token.expires_at)}</td>
              <td className="py-3 pr-3">{statusLabels[status] || status}</td>
              <td className="py-3 text-right">{!token.revoked_at && status !== "revoked" && <button type="button" className="btn btn-outline-danger" aria-label={`Отозвать токен ${token.name || token.prefix}`}
                onClick={() => { setRevokeToken(token); setRevokeError(""); }}><Trash2 size={14} /> Отозвать</button>}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>}
      <form onSubmit={create} className="space-y-3" noValidate>
        <h3 className="font-semibold text-sm">Новый токен</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div><label className="label" htmlFor="api-token-name">Название токена</label>
            <input id="api-token-name" data-testid="api-token-name" className="input" maxLength={255} value={name} disabled={creating}
              placeholder="Например, Telegram-бот" aria-invalid={!!errors.name}
              onChange={(event) => { setName(event.target.value); setErrors((current) => ({ ...current, name: "", general: "" })); }} />
            {errors.name && <p role="alert" className="text-xs mt-1" style={{ color: "var(--danger)" }}>{errors.name}</p>}
          </div>
          <div><label className="label" htmlFor="api-token-expires">Дата прекращения работы</label>
            <div className="relative">
            <input id="api-token-expires" data-testid="api-token-expires" type="text" inputMode="numeric" maxLength={10}
              className={`input font-mono ${errors.expires_at ? "error" : ""}`} value={expires} disabled={creating}
              aria-invalid={!!errors.expires_at} aria-describedby="api-token-date-help"
              onChange={(event) => {
                setExpires(formatDateInput(event.target, expires, event.nativeEvent?.inputType, 8));
                setErrors((current) => ({ ...current, expires_at: "", general: "" }));
              }} />
            <div aria-hidden="true" className="absolute inset-0 border border-transparent rounded-lg px-3 py-2 text-sm font-mono whitespace-pre pointer-events-none overflow-hidden">
              <span style={{ visibility: "hidden" }}>{expires}</span>
              <span data-testid="api-token-expires-template" style={{ color: "var(--text-muted)" }}>{"дд/мм/гггг".slice(expires.length)}</span>
            </div>
            </div>
            <p id="api-token-date-help" className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Формат: дд/мм/гггг. Введите только цифры. Токен перестанет работать с начала этой даты в вашем часовом поясе.
            </p>
            {errors.expires_at && <p role="alert" className="text-xs mt-1" style={{ color: "var(--danger)" }}>{errors.expires_at}</p>}
          </div>
        </div>
        {errors.general && <p role="alert" className="text-sm" style={{ color: "var(--danger)" }}>{errors.general}</p>}
        <button type="submit" data-testid="api-token-create" className="btn btn-primary" disabled={creating || loading || !!loadError}>
          {creating ? <span className="spinner" /> : <Plus size={14} />} Создать токен
        </button>
      </form>
      <Modal open={!!issued} onClose={closeSecret} title="API-токен создан" testid="api-token-secret-modal"
        footer={<button type="button" className="btn btn-primary" onClick={closeSecret}>Готово</button>}>
        <p className="text-sm mb-3">Скопируйте и сохраните токен сейчас. После закрытия этого окна посмотреть его снова нельзя.</p>
        {issued && <>
          <p className="text-sm mb-3"><b>{issued.token.name}</b> · перестанет работать {dateLabel(issued.token.expires_at)}</p>
          <label className="label" htmlFor="api-token-secret">API-токен</label>
          <textarea id="api-token-secret" data-testid="api-token-secret" className="input font-mono text-sm" rows={3} readOnly value={issued.secret} spellCheck={false}
            onFocus={(event) => event.target.select()} />
          <button type="button" className="btn btn-ghost mt-3" onClick={copy}><Copy size={14} /> Скопировать</button>
          {copyMessage && <p role="status" className="text-sm mt-2">{copyMessage}</p>}
        </>}
      </Modal>
      <Modal open={!!revokeToken} onClose={() => { if (!revoking) setRevokeToken(null); }} title="Отозвать API-токен?" testid="api-token-revoke-modal"
        footer={<><button type="button" className="btn btn-ghost" disabled={revoking} onClick={() => setRevokeToken(null)}>Отмена</button>
          <button type="button" data-testid="api-token-revoke-confirm" className="btn btn-danger" disabled={revoking} onClick={revoke}>Отозвать</button></>}>
        <p className="text-sm">Токен «{revokeToken?.name || revokeToken?.prefix}» перестанет работать. Подключённому сервису понадобится новый токен.</p>
        {revokeError && <p role="alert" className="text-sm mt-3" style={{ color: "var(--danger)" }}>{revokeError}</p>}
      </Modal>
    </section>
  );
}
