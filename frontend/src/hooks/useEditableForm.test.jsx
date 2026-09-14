import React, { act } from "react";
import { createRoot } from "react-dom/client";
import useEditableForm from "./useEditableForm";
import * as api from "../mock/api";
jest.mock("../mock/api", () => ({ getForm: jest.fn(), patchField: jest.fn(), addField: jest.fn(), moveField: jest.fn(), removeField: jest.fn() }));
let state, root;
const initial = { fields: [{ id: 1, title: "Question", resources: [] }] };
const validate = () => "";
const notify = jest.fn();
function Harness({ eventId = "1" }) { state = useEditableForm(eventId, validate, notify); return null; }
const tick = () => act(async () => { jest.advanceTimersByTime(701); });
beforeEach(async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.useFakeTimers(); jest.resetAllMocks();
  api.getForm.mockResolvedValue(initial); api.patchField.mockResolvedValue({});
  api.removeField.mockResolvedValue({}); api.moveField.mockResolvedValue({});
  root = createRoot(document.createElement("div"));
  await act(async () => root.render(<Harness />));
});
afterEach(() => { act(() => root.unmount()); jest.useRealTimers(); });
test("uploads postpone autosave and preserve newer text", async () => {
  act(() => { state.patchLocal(1, { title: "New text" }); state.onUploadBusy(1, true); });
  await tick(); expect(api.patchField).not.toHaveBeenCalled();
  act(() => state.patchLocal(1, (field) => ({ resources: [...field.resources, { file_id: "pdf" }] })));
  act(() => state.onUploadBusy(1, false)); await tick();
  expect(api.patchField).toHaveBeenCalledWith("1", 1, expect.objectContaining({ title: "New text", resources: [{ file_id: "pdf" }] }), expect.anything());
  expect(state.saveStatus).toBe("saved");
});
test("deletion cancels pending save", async () => {
  act(() => state.patchLocal(1, { title: "Pending" }));
  api.getForm.mockResolvedValue({ fields: [] });
  await act(async () => state.remove(1)); await tick();
  expect(api.patchField).not.toHaveBeenCalled();
  expect(api.removeField).toHaveBeenCalledWith("1", 1);
});
test("requests are serialized and latest draft wins", async () => {
  let resolve;
  api.patchField.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  act(() => state.patchLocal(1, { title: "First" })); await tick();
  act(() => state.patchLocal(1, { title: "Second" })); await tick();
  expect(api.patchField).toHaveBeenCalledTimes(1);
  await act(async () => resolve({}));
  expect(api.patchField).toHaveBeenCalledTimes(2);
  expect(api.patchField.mock.calls[1][2].title).toBe("Second");
  expect(state.form.fields[0].title).toBe("Second");
});
test("reordering waits for draft save", async () => {
  let resolve, moving;
  api.patchField.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  act(() => state.patchLocal(1, { title: "Pending" }));
  await act(async () => { moving = state.move(1, "down"); });
  expect(api.moveField).not.toHaveBeenCalled();
  await act(async () => { resolve({}); await moving; });
  expect(api.moveField).toHaveBeenCalledWith("1", 1, "down");
});
test("unmount cancels timers and aborts requests", async () => {
  act(() => state.patchLocal(1, { title: "Pending" }));
  const signal = api.getForm.mock.calls[0][1];
  act(() => root.render(null)); await tick();
  expect(api.patchField).not.toHaveBeenCalled(); expect(signal.aborted).toBe(true);
});
test("old event response cannot replace current event", async () => {
  let resolve;
  api.getForm.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  await act(async () => root.render(<Harness eventId="2" />));
  api.getForm.mockResolvedValueOnce({ fields: [{ id: 3, title: "Current" }] });
  await act(async () => root.render(<Harness eventId="3" />));
  await act(async () => resolve({ fields: [{ id: 2, title: "Stale" }] }));
  expect(state.form.fields[0].title).toBe("Current");
});
