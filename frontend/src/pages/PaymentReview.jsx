import React, { useEffect, useState } from "react";
import * as api from "../mock/api";

export default function PaymentReview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    setBusy(true);
    try { setData(await api.getPaymentReview()); setError(""); }
    catch (err) { setError(err.message_ru || "Не удалось загрузить журнал."); }
    finally { setBusy(false); }
  };
  useEffect(() => { refresh(); }, []);
  return <div className="max-w-5xl space-y-4">
    <h1 className="text-2xl font-bold">Пожертвования, требующие проверки</h1>
    <button className="btn btn-primary" disabled={busy} onClick={refresh}>{busy ? "Загрузка…" : "Обновить журнал"}</button>
    {error && <p role="alert" style={{ color: "var(--danger)" }}>{error}</p>}
    {data && <>
      <div className="surface p-4 text-sm space-y-1">
        {data.configuration && <>
          <p>Среда ВТБ: {data.configuration.environment === "sandbox" ? "Песочница" : "Промышленная"}</p>
          {!data.configuration.configured && <p style={{ color: "var(--warn)" }}>Банковские реквизиты ещё не настроены.</p>}
        </>}
        <p>Просроченные сверки: {data.health.overdue_checks}</p>
        <p>Необработанные уведомления с задержкой: {data.health.overdue_webhooks}</p>
        <p>Незавершённые действия с задержкой: {data.health.overdue_actions}</p>
        <p>Попытки, требующие разбора: {data.health.requires_review}</p>
        <p>Уведомления без найденной попытки: {data.health.unmatched_webhooks}</p>
        <p>Повторяющиеся ошибки последующих действий: {data.health.failed_actions}</p>
      </div>
      {!data.payments.length && <p>Проблемных попыток не обнаружено.</p>}
      {data.payments.map((payment) => <article key={payment.request_id} className="surface p-5 space-y-2 text-sm">
        <p className="font-semibold">{payment.amount} ₽ · {payment.environment} · {payment.attempt_status}</p>
        {payment.participant_id && <a className="link" href={`/participant/${payment.participant_id}?event=${payment.event_id}`}>Открыть участника</a>}
        <p className="break-all">Запрос ВТБ: {payment.request_id}</p>
        <p>Последняя ошибка: {payment.last_error || "—"}</p>
        <details><summary>История событий</summary><pre className="text-xs whitespace-pre-wrap break-all mt-2">{JSON.stringify(payment.events, null, 2)}</pre></details>
      </article>)}
    </>}
  </div>;
}
