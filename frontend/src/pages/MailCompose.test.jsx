import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import MailCompose from "./MailCompose";
import * as api from "../mock/api";

const mockNotify = jest.fn();
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useParams: () => ({ eventId: "1" }), useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams("to=user@example.com")],
}));
jest.mock("../components/AppContext", () => ({ useApp: () => ({ notify: mockNotify }) }));
jest.mock("react-quill", () => () => <div />);
jest.mock("../mock/api", () => ({ listTemplates: jest.fn(), getTemplate: jest.fn(), getFileLimits: jest.fn(),
  uploadFile: jest.fn(), downloadFile: jest.fn(), sendMail: jest.fn(), mailSuggestions: jest.fn() }));
const file = (id) => ({ file_id: id, name: `${id}.pdf`, size: 3 });
const templates = [1, 2].map((id) => ({ id, name: `Template ${id}`, subject: `Subject ${id}` }));
let container, root;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(window, "crypto", { configurable: true, value: { getRandomValues: (array) => require("crypto").randomFillSync(array) } });
  jest.resetAllMocks();
  api.listTemplates.mockResolvedValue(templates);
  api.getTemplate.mockImplementation((event, id) => Promise.resolve({ ...templates[Number(id) - 1], body: "<p>Body</p>", attachments: [file(`template${id}`)] }));
  api.getFileLimits.mockResolvedValue({ upload_purposes: ["mail"], purposes: { mail: {
    allowed_extensions: ["pdf", "doc", "docx"], max_files: 5, max_file_bytes: 1000, max_total_bytes: 5000,
  } } });
  api.sendMail.mockResolvedValue({});
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });
const mount = () => act(async () => root.render(<MailCompose />));
const select = (value) => act(async () => Simulate.change(container.querySelector("select"), { target: { value } }));
const send = () => act(async () => Simulate.click(container.querySelector('[data-testid="mail-send-btn"]')));

test("template loading and active upload block send; manual files survive template changes", async () => {
  await mount();
  let resolveTemplate;
  api.getTemplate.mockImplementationOnce(() => new Promise((resolve) => { resolveTemplate = resolve; }));
  await select("1");
  expect(container.querySelector('[data-testid="mail-send-btn"]').disabled).toBe(true);
  await act(async () => resolveTemplate({ ...templates[0], body: "Body", attachments: [file("template1")] }));
  let resolveUpload;
  api.uploadFile.mockImplementationOnce(() => new Promise((resolve) => { resolveUpload = resolve; }));
  await act(async () => Simulate.change(container.querySelector('input[type="file"]'), {
    target: { files: [new File(["pdf"], "manual.pdf")], value: "" },
  }));
  expect(container.querySelector('[data-testid="mail-send-btn"]').disabled).toBe(true);
  await act(async () => resolveUpload(file("manual")));
  await select("2");
  expect(container.textContent).toContain("manual.pdf");
  expect(container.textContent).toContain("template2.pdf");
  expect(container.textContent).not.toContain("template1.pdf");
  const remove = [...container.querySelectorAll("button")].find((button) => button.textContent === "Убрать");
  await act(async () => Simulate.click(remove));
  await send();
  expect(api.sendMail).toHaveBeenCalledWith("1", expect.objectContaining({ attachment_ids: ["manual"], template_id: "2" }));
  expect(mockNotify).toHaveBeenCalledWith("Письмо поставлено в очередь", "success");
});

test("network retry keeps request key, editing creates a new key", async () => {
  await mount();
  await select("1");
  api.sendMail.mockRejectedValue(new Error("network"));
  await send();
  await send();
  const firstKey = api.sendMail.mock.calls[0][1].idempotency_key;
  expect(firstKey).toBeTruthy();
  expect(api.sendMail.mock.calls[1][1].idempotency_key).toBe(firstKey);
  await select("2");
  await send();
  expect(api.sendMail.mock.calls[2][1].idempotency_key).not.toBe(firstKey);
});
