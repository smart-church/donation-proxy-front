import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import FormResources, { ResourceList } from "./FormResources";
import * as api from "../mock/api";
jest.mock("../mock/api", () => ({ getFileLimits: jest.fn(), downloadFile: jest.fn(),
  resourceDownloadUrl: (event, id) => `/api/v1/public/events/${event}/resources/${id}/download` }));
let root, container, resources;
function Editor() {
  const [items, setItems] = useState([{ file_id: "pdf", title: "", file: { file_id: "pdf", name: "Guide.pdf", size: 3 } }]);
  resources = items;
  return <FormResources eventId="1" resources={items} onChange={setItems} />;
}
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true; jest.clearAllMocks();
  api.getFileLimits.mockResolvedValue({ upload_purposes: ["resource"], purposes: { resource: {
    allowed_extensions: ["pdf", "doc", "docx"], max_files: 5, max_file_bytes: 1000, max_total_bytes: 5000 } } });
  container = document.createElement("div"); root = createRoot(container);
});
afterEach(() => act(() => root.unmount()));
test("adds a link, edits its caption, reorders and removes materials", async () => {
  await act(async () => root.render(<Editor />));
  await act(async () => Simulate.change(container.querySelector('[aria-label="Ссылка на материал"]'), { target: { value: "https://example.org/guide" } }));
  await act(async () => Simulate.click([...container.querySelectorAll("button")].find((b) => b.textContent === "Добавить ссылку")));
  await act(async () => Simulate.change(container.querySelector('[aria-label="Подпись материала 2"]'), { target: { value: "Инструкция" } }));
  await act(async () => Simulate.click(container.querySelectorAll('[title="Материал выше"]')[1]));
  expect(resources[0]).toEqual({ url: "https://example.org/guide", title: "Инструкция" });
  expect(container.querySelector("a").rel).toBe("noopener noreferrer");
  await act(async () => Simulate.click(container.querySelector('[title="Удалить материал"]')));
  expect(resources).toHaveLength(1);
  expect(resources[0].file_id).toBe("pdf");
});
test("public links use resource-scoped downloads and reject script URLs", async () => {
  await act(async () => root.render(<ResourceList publicView eventId="7" resources={[
    { id: 8, file_id: "pdf", file: { name: "Guide.pdf" } }, { id: 9, url: "javascript:alert(1)" },
  ]} />));
  expect(container.querySelectorAll("a")).toHaveLength(1);
  expect(container.querySelector("a").getAttribute("href")).toBe("/api/v1/public/events/7/resources/8/download");
});
