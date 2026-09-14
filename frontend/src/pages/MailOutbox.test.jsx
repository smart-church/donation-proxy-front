import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { MailOutbox } from "./MailOutbox";
import * as api from "../mock/api";

jest.mock("react-router-dom", () => ({
  useParams: () => ({ eventId: "1" }), useNavigate: () => jest.fn(),
}));
jest.mock("../mock/api", () => ({ listMail: jest.fn(), getMailItem: jest.fn() }));

let root, container;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });

test("opens an empty outbox without requiring a selected mail", async () => {
  api.listMail.mockResolvedValue([]);
  await act(async () => root.render(<MailOutbox />));
  expect(container.querySelector("h1").textContent).toBe("Исходящие");
  expect(container.textContent).toContain("В таблице отсутствуют данные");
});

test("renders the list, opens mail details and returns to the list", async () => {
  const mail = { id: 7, subject: "Приглашение", recipients: ["test@example.com"],
    date: "2026-09-14T12:00:00Z", status: "failed", attempts: 2,
    body: "<p>Текст письма</p>", error: "Ошибка отправки", attachments: [] };
  api.listMail.mockResolvedValue([mail]);
  api.getMailItem.mockResolvedValue(mail);
  await act(async () => root.render(<MailOutbox />));
  expect(container.querySelector('[data-testid="mail-outbox-table"]').textContent).toContain("Приглашение");
  await act(async () => Simulate.click(container.querySelector('[data-testid="mail-open-7"]')));
  expect(api.getMailItem).toHaveBeenCalledWith("1", 7);
  expect(container.textContent).toContain("Попыток: 2");
  expect(container.textContent).toContain("Текст письма");
  expect(container.querySelector('[role="alert"]').textContent).toBe("Ошибка отправки");
  const back = [...container.querySelectorAll("button")].find((button) => button.textContent.includes("К списку"));
  await act(async () => Simulate.click(back));
  expect(container.querySelector("h1").textContent).toBe("Исходящие");
});
