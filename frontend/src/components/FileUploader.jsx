import React, { useEffect, useRef, useState } from "react";
import * as api from "../mock/api";

export const formatFileSize = (bytes) => `${Number((bytes / 1024 / 1024).toFixed(1))} МиБ`;
export function filePolicyHint(policy) {
  return `Допустимые расширения: ${policy.allowed_extensions.map((ext) => `.${ext}`).join(", ")}. До ${policy.max_files} файлов, каждый до ${formatFileSize(policy.max_file_bytes)}, всего до ${formatFileSize(policy.max_total_bytes)}.`;
}

/** Shared stage-A building block, wired into mail/forms by their respective stages. */
export default function FileUploader({ eventId, purpose = "mail", files = [], onUploaded, onBusyChange, disabled = false }) {
  const [retryFiles, setRetryFiles] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(null);
  const active = useRef(null);
  const generation = useRef(0);
  const input = useRef(null);
  const busyCallback = useRef(onBusyChange);
  busyCallback.current = onBusyChange;

  useEffect(() => {
    const current = ++generation.current;
    setRetryFiles([]);
    setPolicy(null);
    setError("");
    setProgress(null);
    api.getFileLimits(eventId).then((data) => {
      if (generation.current !== current) return;
      if (!data.upload_purposes.includes(purpose)) throw new Error("Загрузка для этого назначения пока недоступна.");
      setPolicy(data.purposes[purpose]);
    }).catch((e) => {
      if (generation.current === current) setError(e.message_ru || e.message || "Не удалось получить ограничения загрузки.");
    });
    return () => {
      generation.current++;
      active.current?.abort();
      active.current = null;
      busyCallback.current?.(false);
    };
  }, [eventId, purpose]);

  const upload = async (event) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    if (disabled || !selected.length || !policy || active.current) return;
    if (files.length + selected.length > policy.max_files ||
        [...files, ...selected].reduce((sum, f) => sum + f.size, 0) > policy.max_total_bytes) {
      setError("Превышено количество файлов или их суммарный размер.");
      return;
    }
    if (selected.some((f) => !f.size || f.size > policy.max_file_bytes ||
        !policy.allowed_extensions.includes(f.name.split(".").pop().toLowerCase()))) {
      setError("Проверьте формат и размер выбранных файлов.");
      return;
    }
    setRetryFiles([]);
    const remaining = [...selected];
    const controller = new AbortController();
    const current = generation.current;
    active.current = controller;
    busyCallback.current?.(true);
    setError("");
    setProgress(0);
    try {
      for (const file of selected) {
        if (controller.signal.aborted) break;
        setProgress(0);
        const asset = await api.uploadFile(eventId, file, purpose, {
          signal: controller.signal,
          onProgress: (value) => { if (current === generation.current) setProgress(value); },
        });
        if (current !== generation.current) break;
        onUploaded?.(asset);
        remaining.shift();
      }
    } catch (e) {
      if (current === generation.current) setRetryFiles(remaining);
      if (current === generation.current) setError(controller.signal.aborted
        ? "Загрузка отменена. Можно выбрать файл повторно."
        : e.message_ru || "Не удалось загрузить файл. Выберите его повторно.");
    } finally {
      if (current === generation.current) {
        active.current = null;
        setProgress(null);
        busyCallback.current?.(false);
      }
    }
  };

  return <div className="space-y-2">
    <label className="label">Файлы
      <input ref={input} type="file" multiple disabled={disabled || !policy || progress !== null}
        accept={policy?.allowed_extensions.map((ext) => `.${ext}`).join(",")}
        onChange={upload} className="block mt-2" />
    </label>
    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
      {policy ? filePolicyHint(policy) : "Загружаем ограничения файлов…"}
    </p>
    {progress !== null && <div role="status">
      {progress === 100 ? "Файл загружен, проверяем содержимое…" : `Загрузка: ${progress}%`}
      <button type="button" className="btn btn-ghost" onClick={() => active.current?.abort()}>Отменить</button>
    </div>}
    {retryFiles.length > 0 && <button type="button" className="btn btn-ghost" disabled={disabled || progress !== null}
      onClick={() => upload({ target: { files: retryFiles, value: "" } })}>Повторить загрузку</button>}
    {error && <p role="alert" style={{ color: "var(--danger)" }}>{error}</p>}
  </div>;
}
