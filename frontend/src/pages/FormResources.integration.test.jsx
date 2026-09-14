import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import FormEdit from "./FormEdit";
import { PublicForm } from "./PublicForm";
import * as api from "../mock/api";
const mockNotify = jest.fn();
jest.mock("react-router-dom", () => ({ useParams: () => ({ eventId: "1", id: "1" }), useNavigate: () => jest.fn() }));
jest.mock("../components/AppContext", () => ({ useApp: () => ({ notify: mockNotify }) }));
jest.mock("../mock/api", () => ({ getForm: jest.fn(), getPublicForm: jest.fn(), getFileLimits: jest.fn(),
  uploadFile: jest.fn(), patchField: jest.fn(), resourceDownloadUrl: (event, id) => `/resources/${id}` }));
let root, container;
const field = { id: 1, order: 1, type: "filler", title: "Материалы", resources: [], required: false };
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true; jest.resetAllMocks(); jest.useFakeTimers();
  api.getForm.mockResolvedValue({ fields: [field] }); api.patchField.mockResolvedValue({});
  api.getFileLimits.mockResolvedValue({ upload_purposes: ["resource"], purposes: { resource: {
    allowed_extensions: ["pdf", "doc", "docx"], max_files: 5, max_file_bytes: 1000, max_total_bytes: 5000 } } });
  container = document.createElement("div"); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); jest.useRealTimers(); });
test("filler upload stays mounted while busy and saves alongside edited title", async () => {
  let resolve;
  api.uploadFile.mockImplementation(() => new Promise((done) => { resolve = done; }));
  await act(async () => root.render(<FormEdit />));
  await act(async () => Simulate.change(container.querySelector('input[type="file"]'), {
    target: { files: [new File(["pdf"], "guide.pdf")], value: "" },
  }));
  expect(container.querySelector('input[type="file"]')).not.toBeNull();
  expect(container.querySelector('[data-testid="form-add-field"]').disabled).toBe(true);
  await act(async () => Simulate.change(container.querySelector('[data-testid="field-title-1"]'), { target: { value: "Новое описание" } }));
  await act(async () => resolve({ file_id: "file", name: "guide.pdf", size: 3 }));
  await act(async () => jest.advanceTimersByTime(701));
  expect(api.patchField).toHaveBeenCalledWith("1", 1, expect.objectContaining({ title: "Новое описание", resources: [expect.objectContaining({ file_id: "file" })] }), expect.anything());
});
test("public form shows materials for both filler and regular question", async () => {
  const resources = [{ id: 2, file_id: "file", title: "Инструкция", file: { name: "guide.pdf" } }];
  api.getPublicForm.mockResolvedValue({ event: { name: "Event", registration_open: true }, fields: [
    { ...field, resources }, { ...field, id: 3, type: "text", resources },
  ] });
  await act(async () => root.render(<PublicForm />));
  expect(container.querySelectorAll('a[href="/resources/2"]')).toHaveLength(2);
});
