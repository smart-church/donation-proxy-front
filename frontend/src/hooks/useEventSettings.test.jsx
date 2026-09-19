import React, { act } from "react";
import { createRoot } from "react-dom/client";
import useEventSettings from "./useEventSettings";
import * as api from "../mock/api";
jest.mock("../mock/api", () => ({ getEvent: jest.fn(), updateEvent: jest.fn() }));
const initial = { name: "Event", auto_mail_enabled: false };
const notify = jest.fn();
let state, root;
function Harness({ id = "1" }) { state = useEventSettings(id, notify); return null; }
const tick = () => act(async () => { jest.advanceTimersByTime(3000); });
beforeEach(async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.useFakeTimers(); jest.resetAllMocks();
  api.getEvent.mockResolvedValue(initial); api.updateEvent.mockResolvedValue({});
  root = createRoot(document.createElement("div"));
  await act(async () => root.render(<Harness />));
});
afterEach(async () => { await act(async () => root.unmount()); jest.useRealTimers(); });
test("saves changed settings every three seconds without redundant requests", async () => {
  await tick(); expect(api.updateEvent).not.toHaveBeenCalled();
  act(() => state.patch({ name: "Changed" })); await tick();
  expect(api.updateEvent).toHaveBeenCalledWith("1", { ...initial, name: "Changed" });
  expect(state.status).toBe("saved");
  await tick(); expect(api.updateEvent).toHaveBeenCalledTimes(1);
});
test("leaving saves the latest draft immediately", async () => {
  act(() => state.patch({ name: "Leaving" }));
  await act(async () => root.render(null));
  expect(api.updateEvent).toHaveBeenCalledWith("1", { ...initial, name: "Leaving" });
});
test("in-flight saves finish before newer changes even after leaving", async () => {
  let finish;
  api.updateEvent.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  act(() => state.patch({ name: "First" })); await tick();
  act(() => state.patch({ name: "Latest" })); await tick();
  await act(async () => root.render(null));
  expect(api.updateEvent).toHaveBeenCalledTimes(1);
  await act(async () => finish({}));
  expect(api.updateEvent).toHaveBeenCalledTimes(2);
  expect(api.updateEvent.mock.calls[1][1].name).toBe("Latest");
});
test("failed saves retry", async () => {
  api.updateEvent.mockRejectedValueOnce({ message_ru: "Ошибка сети" });
  act(() => state.patch({ name: "Retry" })); await tick();
  expect(state.status).toBe("error"); expect(state.errors.general).toBe("Ошибка сети");
  await tick(); expect(state.status).toBe("saved");
});
test("invalid fields block saving until corrected", async () => {
  act(() => state.patch({ name: "", auto_mail_enabled: true })); await tick();
  expect(api.updateEvent).not.toHaveBeenCalled();
  expect(state.errors.title).toBeTruthy(); expect(state.errors.success_form_template).toBeTruthy();
  act(() => state.patch({ name: "Valid", success_template_id: 2 })); await tick();
  expect(state.status).toBe("saved");
});
test("deleting drains active request and cancels pending changes", async () => {
  let finish, stopped = false, stopping;
  api.updateEvent.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  act(() => state.patch({ name: "First" })); await tick();
  act(() => state.patch({ name: "Cancel" }));
  await act(async () => { stopping = state.stop().then(() => { stopped = true; }); });
  expect(stopped).toBe(false);
  await act(async () => { finish({}); await stopping; });
  expect(stopped).toBe(true);
  await act(async () => root.render(null)); await tick();
  expect(api.updateEvent).toHaveBeenCalledTimes(1);
});
test("event changes save the old draft under the old ID", async () => {
  act(() => state.patch({ name: "Old" }));
  api.getEvent.mockResolvedValueOnce({ ...initial, name: "Other" });
  await act(async () => root.render(<Harness id="2" />));
  expect(api.updateEvent).toHaveBeenCalledWith("1", { ...initial, name: "Old" });
  expect(state.ev.name).toBe("Other");
  await tick(); expect(api.updateEvent).toHaveBeenCalledTimes(1);
});
test("tab close flushes and warns only while unsaved", async () => {
  act(() => state.patch({ name: "Closing" }));
  const event = new Event("beforeunload", { cancelable: true });
  await act(async () => window.dispatchEvent(event));
  expect(event.defaultPrevented).toBe(true);
  expect(api.updateEvent).toHaveBeenCalledTimes(1);
  const saved = new Event("beforeunload", { cancelable: true });
  act(() => window.dispatchEvent(saved)); expect(saved.defaultPrevented).toBe(false);
});

test("incomplete rule waits for completion, then autosaves and can be removed on exit", async () => {
  act(() => state.patch({ auto_mail_rule: { question_id: "", answers: [] } }));
  await tick();
  expect(api.updateEvent).not.toHaveBeenCalled();
  expect(state.errors.auto_mail_rule).toBeTruthy();
  act(() => state.patch({ auto_mail_rule: { question_id: 1, answers: [{ option: "Online", template_id: 2 }] } }));
  await tick();
  expect(api.updateEvent.mock.calls[0][1].auto_mail_rule).toEqual({ question_id: 1, answers: [{ option: "Online", template_id: 2 }] });
  act(() => state.patch({ auto_mail_rule: null }));
  await act(async () => root.render(null));
  expect(api.updateEvent.mock.calls[1][1].auto_mail_rule).toBeNull();
});
test("rule errors returned by the API are shown against the rule", async () => {
  api.updateEvent.mockRejectedValueOnce({ field_errors: { auto_mail_rule: "Вариант удалён" } });
  act(() => state.patch({ auto_mail_rule: { question_id: 1, answers: [{ option: "Online", template_id: 2 }] } }));
  await tick();
  expect(state.errors.auto_mail_rule).toBe("Вариант удалён");
  expect(state.status).toBe("error");
});
