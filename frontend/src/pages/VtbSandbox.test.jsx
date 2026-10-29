import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import VtbSandbox from "./VtbSandbox";
import * as api from "../mock/api";

jest.mock("../mock/api", () => ({ createVtbSandboxQr: jest.fn(), getVtbSandboxQrStatus: jest.fn() }));
let container, root;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.resetAllMocks();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<VtbSandbox />));
});
afterEach(() => { act(() => root.unmount()); container.remove(); });
const change = (id, value) => act(() => Simulate.change(container.querySelector(`#vtb-${id}`), { target: { value } }));
const submit = () => act(async () => Simulate.submit(container.querySelector("form")));
const checkButton = () => [...container.querySelectorAll("button")].find((button) => button.textContent === "Проверить оплату в ВТБ");

test("checks the created sandbox QR with its original credentials and displays the bank status", async () => {
  change("client_id", "original-client");
  change("client_secret", "original-secret");
  api.createVtbSandboxQr.mockResolvedValue({ environment: "sandbox", qrc_id: "QR123", payment_url: "https://qr.nspk.ru/QR123" });
  await submit();
  change("client_id", "edited-client");
  api.getVtbSandboxQrStatus.mockResolvedValue({ state: "OK", paid: true, payment: { amount: 10, currency: "RUB" } });
  await act(async () => Simulate.click(checkButton()));
  expect(api.getVtbSandboxQrStatus).toHaveBeenCalledWith(expect.objectContaining({
    environment: "sandbox", qrc_id: "QR123", client_id: "original-client", client_secret: "original-secret", include_requests: true,
  }));
  expect(container.querySelector('[role="status"]').textContent).toContain("Оплачен в песочнице ВТБ");
  expect(api.createVtbSandboxQr).toHaveBeenCalledTimes(1);
  api.getVtbSandboxQrStatus.mockRejectedValue({ message_ru: "ВТБ недоступен" });
  await act(async () => Simulate.click(checkButton()));
  expect(container.querySelector('[role="status"]')).toBeNull();
  expect(container.querySelector('[role="alert"]').textContent).toContain("ВТБ недоступен");
  expect(container.querySelector('[aria-label="Созданная платёжная ссылка"]')).not.toBeNull();
});

test("does not offer sandbox payment checks for production QR", async () => {
  api.createVtbSandboxQr.mockResolvedValue({ environment: "production", qrc_id: "PROD123" });
  await submit();
  expect(checkButton()).toBeUndefined();
});

test("prevents duplicate status checks and clears the result with credentials", async () => {
  api.createVtbSandboxQr.mockResolvedValue({ environment: "sandbox", qrc_id: "QR123" });
  await submit();
  let finish;
  api.getVtbSandboxQrStatus.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const button = checkButton();
  await act(async () => { Simulate.click(button); Simulate.click(button); });
  expect(api.getVtbSandboxQrStatus).toHaveBeenCalledTimes(1);
  expect(container.querySelector('button[type="submit"]').disabled).toBe(true);
  await act(async () => finish({ state: "CREATED", paid: false }));
  expect(container.querySelector('[role="status"]').textContent).toContain("Успешная оплата не подтверждена");
  await act(async () => Simulate.click([...container.querySelectorAll("button")].find((button) => button.textContent === "Очистить реквизиты")));
  expect(container.querySelector('[role="status"]')).toBeNull();
  expect(checkButton()).toBeUndefined();
});

test("defaults to sandbox and exposes a safe payment link without navigating away", async () => {
  change("client_id", "test-client");
  change("client_secret", "test-secret");
  change("merchant_authorization", "sandbox-merchant-token");
  api.createVtbSandboxQr.mockResolvedValue({ payment_url: "https://qr.nspk.ru/QR123", qrc_id: "QR123",
    request_id: "request-123", amount: "10.00", currency: "RUB", qr_ttl: 20, status: "CREATED", environment: "sandbox" });
  await submit();
  expect(api.createVtbSandboxQr).toHaveBeenCalledWith(expect.objectContaining({
    client_id: "test-client", client_secret: "test-secret", merchant_authorization: "sandbox-merchant-token",
    amount: "10.00", qr_ttl: 20, environment: "sandbox",
    include_requests: true,
  }));
  expect(container.querySelector("a").href).toBe("https://qr.nspk.ru/QR123");
  expect(container.querySelector("a").rel).toBe("noopener noreferrer");
  expect(container.textContent).toContain("request-123");
  expect(container.querySelector("#vtb-client_secret").type).toBe("password");
});

test("uses fixed sandbox without an environment selector and clears credentials", async () => {
  expect(container.querySelector("#vtb-environment")).toBeNull();
  expect(container.querySelector("select")).toBeNull();
  expect(container.textContent).toContain("Песочница ВТБ — тестовые операции");
  change("client_id", "test-client");
  change("client_secret", "test-secret");
  change("merchant_authorization", "test-merchant-token");
  const clear = [...container.querySelectorAll("button")].find((button) => button.textContent === "Очистить реквизиты");
  await act(async () => Simulate.click(clear));
  expect(container.querySelector("#vtb-client_id").value).toBe("");
  expect(container.querySelector("#vtb-client_secret").value).toBe("");
  expect(container.querySelector("#vtb-merchant_authorization").value).toBe("");
  api.createVtbSandboxQr.mockResolvedValue({ environment: "sandbox" });
  await submit();
  expect(api.createVtbSandboxQr).toHaveBeenCalledWith(expect.objectContaining({ environment: "sandbox" }));
});

test("blocks double submission while request is pending", async () => {
  let finish;
  api.createVtbSandboxQr.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  await submit();
  await submit();
  expect(api.createVtbSandboxQr).toHaveBeenCalledTimes(1);
  expect(container.querySelector('button[type="submit"]').disabled).toBe(true);
  await act(async () => finish({ payment_url: "https://qr.nspk.ru/QR123" }));
});

test("shows uncertain outcome and does not retry automatically", async () => {
  api.createVtbSandboxQr.mockRejectedValue({ message_ru: "QR мог быть создан.",
    response: { data: { request_id: "uncertain-request" } } });
  await submit();
  expect(container.querySelector('[role="alert"]').textContent).toContain("uncertain-request");
  expect(api.createVtbSandboxQr).toHaveBeenCalledTimes(1);
  expect(container.querySelector("a")).toBeNull();
});

test("shows bank refusal diagnostics for support", async () => {
  api.createVtbSandboxQr.mockRejectedValue({ message_ru: "ВТБ отклонил запрос создания QR.",
    response: { data: { request_id: "failed-request", bank: { stage: "qr", http_status: 400,
      error_id: "DYNAMICS_VALIDATE_001", trace_id: "trace-bank-123", description: "Некорректное значение amount" } } } });
  await submit();
  const text = container.querySelector('[role="alert"]').textContent;
  for (const expected of ["Создание QR", "400", "DYNAMICS_VALIDATE_001", "trace-bank-123", "Некорректное значение amount"]) {
    expect(text).toContain(expected);
  }
});

test("shows exact certificate failure and affected bank host", async () => {
  api.createVtbSandboxQr.mockRejectedValue({ message_ru: "Не удалось проверить TLS-сертификат ВТБ.",
    response: { data: { request_id: "tls-request", bank: { stage: "auth", host: "epa-ift-sbp.vtb.ru",
      tls_verify_code: 20, tls_verify_message: "unable to get local issuer certificate" } } } });
  await submit();
  const text = container.querySelector('[role="alert"]').textContent;
  for (const expected of ["Получение токена", "epa-ift-sbp.vtb.ru", "20", "unable to get local issuer certificate"]) {
    expect(text).toContain(expected);
  }
});

test("shows gateway transaction id for a plain-text refusal", async () => {
  api.createVtbSandboxQr.mockRejectedValue({ message_ru: "ВТБ запретил доступ к созданию QR (HTTP 403).",
    response: { data: { request_id: "forbidden-request", bank: { stage: "qr", http_status: 403,
      gateway_transaction_id: "12345678-1234-1234-1234-123456789abc", message: "Forbidden" } } } });
  await submit();
  const text = container.querySelector('[role="alert"]').textContent;
  expect(text).toContain("Transaction ID шлюза ВТБ");
  expect(text).toContain("12345678-1234-1234-1234-123456789abc");
});

const requestTraces = [
  { stage: "auth", method: "POST", url: "https://epa-ift-sbp.vtb.ru/passport/oauth2/token",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials&client_id=client&client_secret=full-client-secret",
    state: "response_received", http_status: 200,
    response: { status: 200, reason: "OK", headers: [["Content-Type", "application/json"], ["X-Auth-Debug", "auth-response-header"]],
      body: '{"access_token":"full-oauth-token","expires_in":179}', body_complete: true } },
  { stage: "qr", method: "POST", url: "https://test3.api.vtb.ru:8443/openapi/smb/efcp/sbp-gateway/v1/qr/dynamics",
    headers: { Authorization: "Bearer full-oauth-token", "Merchant-Authorization": "full-merchant-token" },
    body: '{"requestId":"sent-request","amount":10.00}', state: "response_received", http_status: 403,
    response: { status: 403, reason: "Forbidden", headers: [["Content-Type", "text/plain"], ["X-Diagnostic", "first"], ["X-Diagnostic", "second"]],
      body: "Forbidden\nTransaction ID: bank-full-response-id", body_complete: true } },
];

test("shows full request headers and bodies on failure and clears them with credentials", async () => {
  api.createVtbSandboxQr.mockRejectedValue({ message_ru: "ВТБ запретил доступ", response: { data: { requests: requestTraces } } });
  await submit();
  const section = container.querySelector('[aria-label="Запросы к ВТБ"]');
  expect(section.querySelectorAll("pre")).toHaveLength(4);
  for (const value of ["full-client-secret", "Bearer full-oauth-token", "full-merchant-token", "sent-request", "HTTP 403",
    '"access_token":"full-oauth-token"', "X-Auth-Debug: auth-response-header", "HTTP 403 Forbidden",
    "Transaction ID: bank-full-response-id", "X-Diagnostic: first", "X-Diagnostic: second"]) {
    expect(section.textContent).toContain(value);
  }
  const clear = [...container.querySelectorAll("button")].find((button) => button.textContent === "Очистить реквизиты");
  await act(async () => Simulate.click(clear));
  expect(container.querySelector('[aria-label="Запросы к ВТБ"]')).toBeNull();
});

test("shows request trace on success and removes it on a new creation", async () => {
  const successTraces = [requestTraces[0], { ...requestTraces[1], http_status: 200,
    response: { status: 200, reason: "OK", headers: [["Content-Type", "application/json"]],
      body: '{"code":"RQ00000","data":{"qrcId":"QR123"}}', body_complete: true } }];
  api.createVtbSandboxQr.mockResolvedValue({ requests: successTraces, payment_url: "https://qr.nspk.ru/QR123", environment: "sandbox" });
  await submit();
  expect(container.querySelector('[aria-label="Запросы к ВТБ"]').textContent).toContain("full-oauth-token");
  expect(container.querySelector('[aria-label="Запросы к ВТБ"]').textContent).toContain('"code":"RQ00000"');
  api.createVtbSandboxQr.mockResolvedValue({ environment: "sandbox" });
  await submit();
  expect(container.querySelector('[aria-label="Запросы к ВТБ"]')).toBeNull();
});
