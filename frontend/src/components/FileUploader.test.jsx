import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import FileUploader from "./FileUploader";
import * as api from "../mock/api";

jest.mock("../mock/api", () => ({ getFileLimits: jest.fn(), uploadFile: jest.fn() }));
const policy = { allowed_extensions: ["pdf", "jpg", "jpeg", "png", "doc", "docx"], max_files: 5,
  max_file_bytes: 5242880, max_total_bytes: 10485760 };
let container, root;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  api.getFileLimits.mockResolvedValue({ purposes: { mail: policy }, upload_purposes: ["mail", "resource"] });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});
const mount = async (props = {}) => {
  await act(async () => root.render(<FileUploader eventId={1} {...props} />));
};
test("shows server extensions including Word and uses them in the picker", async () => {
  await mount();
  expect(container.textContent).toContain(".doc, .docx");
  expect(container.textContent).toContain("каждый до 5 МиБ");
  expect(container.querySelector("input").accept).toBe(".pdf,.jpg,.jpeg,.png,.doc,.docx");
});
test("does not upload a disallowed extension", async () => {
  await mount();
  await act(async () => Simulate.change(container.querySelector("input"), {
    target: { files: [new File(["MZ"], "bad.exe")], value: "" },
  }));
  expect(api.uploadFile).not.toHaveBeenCalled();
  expect(container.querySelector('[role="alert"]').textContent).toContain("формат");
});
test("passes a Word file to API and reports completion", async () => {
  const uploaded = jest.fn();
  const busy = jest.fn();
  api.uploadFile.mockResolvedValue({ file_id: "id", name: "Документ.docx", size: 3 });
  await mount({ onUploaded: uploaded, onBusyChange: busy });
  const file = new File(["zip"], "Документ.docx");
  await act(async () => Simulate.change(container.querySelector("input"), { target: { files: [file], value: "" } }));
  expect(api.uploadFile).toHaveBeenCalledWith(1, file, "mail", expect.any(Object));
  expect(uploaded).toHaveBeenCalledWith(expect.objectContaining({ name: "Документ.docx" }));
  expect(busy).toHaveBeenLastCalledWith(false);
});
test("disables participant uploads until backend enables them", async () => {
  await mount({ purpose: "answer" });
  expect(container.querySelector("input").disabled).toBe(true);
  expect(container.querySelector('[role="alert"]').textContent).toContain("недоступна");
});

test("retry uploads only the failed files after partial success", async () => {
  const uploaded = jest.fn();
  api.uploadFile.mockResolvedValueOnce({ file_id: "first", name: "first.pdf", size: 3 })
    .mockRejectedValueOnce(new Error("network"))
    .mockResolvedValueOnce({ file_id: "second", name: "second.pdf", size: 3 });
  await mount({ onUploaded: uploaded });
  const first = new File(["pdf"], "first.pdf");
  const second = new File(["pdf"], "second.pdf");
  await act(async () => Simulate.change(container.querySelector("input"), { target: { files: [first, second], value: "" } }));
  const retry = [...container.querySelectorAll("button")].find((button) => button.textContent === "Повторить загрузку");
  await act(async () => Simulate.click(retry));
  expect(api.uploadFile.mock.calls.map((args) => args[1].name)).toEqual(["first.pdf", "second.pdf", "second.pdf"]);
  expect(uploaded).toHaveBeenCalledTimes(2);
});
