import React, { useRef, useState } from "react";
import * as api from "../mock/api";

const initialForm = {
  environment: "sandbox",
  client_id: "", client_secret: "", merchant_authorization: "", source_system_id: "",
  amount: "10.00", qr_ttl: "20", purpose: "Пожертвование", redirect_url: "",
};

export default function VtbSandbox() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState("");
  const [bankError, setBankError] = useState(null);
  const [requests, setRequests] = useState([]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [checking, setChecking] = useState(false);
  const qrCredentials = useRef(null);
  const inFlight = useRef(false);
  const working = busy || checking;

  const clearPaymentStatus = () => {
    setPaymentStatus(null);
    qrCredentials.current = null;
  };

  const field = (name, label, props = {}) => (
    <div>
      <label className="label" htmlFor={`vtb-${name}`}>{label}</label>
      <input id={`vtb-${name}`} name={name} className="input" value={form[name]}
        disabled={working} onChange={(e) => setForm((current) => ({ ...current, [name]: e.target.value }))}
        {...props} />
    </div>
  );

  const submit = async (event) => {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setResult(null);
    clearPaymentStatus();
    setError("");
    setRequestId("");
    setBankError(null);
    setRequests([]);
    setCopied(false);
    try {
      const { requests: traces = [], ...response } = await api.createVtbSandboxQr({
        ...form, qr_ttl: Number(form.qr_ttl), include_requests: true,
      });
      setRequests(traces);
      qrCredentials.current = { client_id: form.client_id, client_secret: form.client_secret,
        merchant_authorization: form.merchant_authorization, source_system_id: form.source_system_id };
      setResult({ ...response, receivedAt: new Date().toLocaleString("ru-RU") });
    } catch (err) {
      setError(err.response
        ? err.message_ru || "Не удалось создать ссылку."
        : "Ответ не получен. QR мог быть создан. Автоматический повтор не выполняется.");
      setRequestId(err.response?.data?.request_id || "");
      setBankError(err.response?.data?.bank || null);
      setRequests(err.response?.data?.requests || []);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const checkPayment = async () => {
    if (inFlight.current || result?.environment !== "sandbox" || !result.qrc_id || !qrCredentials.current) return;
    inFlight.current = true;
    setChecking(true);
    setPaymentStatus(null);
    setError(""); setRequestId(""); setBankError(null); setRequests([]);
    try {
      const { requests: traces = [], ...response } = await api.getVtbSandboxQrStatus({
        ...qrCredentials.current, environment: "sandbox", qrc_id: result.qrc_id, include_requests: true,
      });
      setRequests(traces);
      setPaymentStatus({ ...response, checkedAt: new Date().toLocaleString("ru-RU") });
    } catch (err) {
      setError(err.message_ru || "Не удалось получить статус оплаты. Повторите проверку позже.");
      setRequestId(err.response?.data?.request_id || "");
      setBankError(err.response?.data?.bank || null);
      setRequests(err.response?.data?.requests || []);
    } finally {
      inFlight.current = false;
      setChecking(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.payment_url);
      setCopied(true);
    } catch {
      setError("Не удалось скопировать ссылку. Выделите её и скопируйте вручную.");
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Администрация › СБП ВТБ: платёжные ссылки</div>
      <h1 className="text-3xl font-extrabold mb-3">СБП ВТБ: платёжные ссылки</h1>
      <p className="text-sm mb-5" style={{ color: "var(--text-dim)" }}>
        Создание динамической платёжной ссылки в песочнице ВТБ. Используйте тестовые реквизиты торговой точки.
        Секреты доступны только на этой странице до её закрытия и не сохраняются на сервере.
      </p>
      <form onSubmit={submit} autoComplete="off" className="surface p-5 space-y-4">
        <p className="text-sm font-semibold">Песочница ВТБ — тестовые операции</p>
        <fieldset disabled={working} className="space-y-4">
          <legend className="font-semibold mb-3">Доступ к песочнице</legend>
          {field("client_id", "Client ID", { required: true, maxLength: 1024, autoComplete: "off" })}
          {field("client_secret", "Client Secret", { type: "password", required: true, maxLength: 4096, autoComplete: "new-password" })}
          {field("merchant_authorization", "Merchant Authorization / Merchant Token (если выдан банком)", { type: "password", maxLength: 4096, autoComplete: "new-password" })}
          {field("source_system_id", "Source System ID (необязательно)", { maxLength: 255 })}
          <button className="btn btn-ghost" type="button" onClick={() => {
            setForm((current) => ({ ...current, client_id: "", client_secret: "", merchant_authorization: "", source_system_id: "" }));
            setRequests([]); setResult(null); setError(""); setRequestId(""); setBankError(null); setCopied(false);
            clearPaymentStatus();
          }}>Очистить реквизиты</button>
        </fieldset>
        <fieldset disabled={working} className="space-y-4">
          <legend className="font-semibold mb-3">Параметры платежа</legend>
          <div className="grid sm:grid-cols-2 gap-4">
            {field("amount", "Сумма, ₽", { type: "number", min: "0.01", max: "1000000", step: "0.01", required: true })}
            {field("qr_ttl", "Срок действия, минут", { type: "number", min: "1", max: "43200", step: "1", required: true })}
          </div>
          {field("purpose", "Назначение платежа", { maxLength: 140, required: true })}
          {field("redirect_url", "URL возврата после оплаты (необязательно)", { type: "url", maxLength: 1024, placeholder: "https://example.ru/payment-result" })}
        </fieldset>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {form.environment === "sandbox" && <>В песочнице результат моделируется по сумме: обычно до 1 000 ₽ — успех, свыше — отказ.
          Специальные суммы 99,99; 501; 502; 900; 901; 902 ₽ используются для отдельных сценариев. </>}
          Каждое нажатие создаёт новый QR. Регистрации участников не создаются.
        </p>
        <button type="submit" className="btn btn-primary" disabled={working}>
          {busy ? "Создаём ссылку…" : "Создать платёжную ссылку"}
        </button>
      </form>
      {error && <div role="alert" className="surface p-4 mt-4" style={{ color: "var(--danger)" }}>
        {error}{requestId && <div className="text-sm mt-2">Идентификатор запроса: {requestId}</div>}
        {bankError && <dl className="text-sm mt-3 space-y-2 break-words">
          {Object.entries({ stage: "Этап", http_status: "HTTP-статус ВТБ", error_id: "Ошибка ВТБ",
            code: "Код ВТБ", trace_id: "Trace ID ВТБ", gateway_transaction_id: "Transaction ID шлюза ВТБ",
            message: "Сообщение ВТБ", description: "Описание ВТБ",
            host: "Сервер ВТБ", tls_verify_code: "Код проверки сертификата", tls_verify_message: "Причина ошибки сертификата" })
            .filter(([key]) => bankError[key] != null && bankError[key] !== "")
            .map(([key, label]) => <div key={key}><dt className="font-semibold">{label}</dt>
              <dd className="whitespace-pre-wrap">{key === "stage" ? ({ auth: "Получение токена", qr: "Создание QR", status: "Проверка оплаты" }[bankError[key]] || bankError[key]) : bankError[key]}</dd></div>)}
        </dl>}
      </div>}
      {requests.length > 0 && <section className="surface p-5 mt-4 space-y-4" aria-label="Запросы к ВТБ">
        <h2 className="text-xl font-bold">Запросы и ответы ВТБ</h2>
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          Полные заголовки и тела, включая Client Secret, Merchant Token и OAuth-токен.
          Кнопка «Очистить реквизиты» также удаляет этот вывод.
        </p>
        {requests.map((request, index) => <article key={`${request.stage}-${index}`} className="space-y-2">
          <h3 className="font-semibold">{index + 1}. {{ auth: "Получение OAuth-токена", qr: "Создание QR", status: "Проверка оплаты" }[request.stage] || request.stage}</h3>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {request.state === "response_received" ? `Получен ответ HTTP ${request.http_status}` : "Запрос сформирован; получение ответа не подтверждено"}
          </p>
          <pre className="text-xs p-4 rounded-md overflow-x-auto whitespace-pre" style={{ background: "var(--bg-elev-2)", color: "var(--text)" }}>
            {`${request.method} ${request.url}\n${Object.entries(request.headers || {}).map(([name, value]) => `${name}: ${value}`).join("\n")}\n\n${request.body}`}
          </pre>
          <h4 className="font-semibold">Ответ ВТБ</h4>
          {request.response ? <>
            <pre className="text-xs p-4 rounded-md overflow-x-auto whitespace-pre" style={{ background: "var(--bg-elev-2)", color: "var(--text)" }}>
              {`HTTP ${request.response.status} ${request.response.reason || ""}\n${(request.response.headers || []).map(([name, value]) => `${name}: ${value}`).join("\n")}\n\n${request.response.body}`}
            </pre>
            {!request.response.body_complete && <p className="text-sm" style={{ color: "var(--danger)" }}>Получена только часть тела ответа.</p>}
          </> : <p className="text-sm" style={{ color: "var(--text-muted)" }}>HTTP-ответ не получен.</p>}
        </article>)}
      </section>}
      {result && <section className="surface p-5 mt-4 space-y-3" aria-label="Созданная платёжная ссылка">
        <h2 className="text-xl font-bold">Платёжная ссылка создана</h2>
        <p className="text-sm font-semibold">{result.environment === "production" ? "Промышленная среда" : "Песочница"}</p>
        <p className="text-sm">{result.amount} {result.currency} · срок действия {result.qr_ttl} мин.</p>
        <label className="label" htmlFor="vtb-payment-url">Ссылка НСПК</label>
        <input id="vtb-payment-url" className="input" readOnly value={result.payment_url} onFocus={(e) => e.target.select()} />
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn btn-ghost" onClick={copy}>{copied ? "Скопировано" : "Скопировать ссылку"}</button>
          <a className="btn btn-primary" href={result.payment_url} target="_blank" rel="noopener noreferrer">Открыть НСПК</a>
        </div>
        <dl className="text-sm space-y-2 break-all" style={{ color: "var(--text-dim)" }}>
          <div><dt className="font-semibold">QR ID</dt><dd>{result.qrc_id}</dd></div>
          <div><dt className="font-semibold">Идентификатор запроса</dt><dd>{result.request_id}</dd></div>
          <div><dt className="font-semibold">Статус создания</dt><dd>{result.status}</dd></div>
          <div><dt className="font-semibold">Ответ получен</dt><dd>{result.receivedAt}</dd></div>
        </dl>
        {result.environment === "sandbox" && result.qrc_id && <div className="space-y-3">
          <button type="button" className="btn btn-primary" disabled={working} onClick={checkPayment}>
            {checking ? "Проверяем оплату…" : "Проверить оплату в ВТБ"}
          </button>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Песочница моделирует оплату по сумме. Кнопка получает текущий статус QR из ВТБ.</p>
          {paymentStatus && <div role="status" className="text-sm space-y-2">
            <p className="font-semibold">{paymentStatus.paid ? "Оплачен в песочнице ВТБ" : "Успешная оплата не подтверждена"}</p>
            <p>Статус ВТБ: {paymentStatus.state}</p>
            <p>Проверено: {paymentStatus.checkedAt}</p>
            {paymentStatus.payment?.amount != null && <p>Сумма по данным ВТБ: {paymentStatus.payment.amount} {paymentStatus.payment.currency}</p>}
            {paymentStatus.payment?.transactionId && <p>Транзакция ВТБ: {paymentStatus.payment.transactionId}</p>}
          </div>}
        </div>}
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Создание ссылки не подтверждает оплату. Результат исчезнет после закрытия страницы.</p>
      </section>}
    </div>
  );
}
