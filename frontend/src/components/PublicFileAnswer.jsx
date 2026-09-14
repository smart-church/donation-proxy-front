import React, { useEffect, useRef, useState } from "react";
import * as api from "../mock/api";
import { filePolicyHint, formatFileSize } from "./FileUploader";

export default function PublicFileAnswer({ eventId, field, files = [], onChange, getSession, onBusyChange, enabled, disabled }) {
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState([]);
  const active = useRef(null);
  const alive = useRef(true);
  const busy = useRef(onBusyChange); busy.current = onBusyChange;
  const policy = field.file_limits;
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; active.current?.abort(); busy.current?.(false); };
  }, []);
  const upload = async (selected) => {
    if (active.current || !selected.length || !enabled || disabled) return;
    if (files.length + selected.length > policy.max_files || [...files, ...selected].reduce((sum, f) => sum + f.size, 0) > policy.max_total_bytes ||
      selected.some((f) => !f.size || f.size > policy.max_file_bytes || !policy.allowed_extensions.includes(f.name.split('.').pop().toLowerCase()))) {
      setError("Проверьте формат, количество и размер файлов."); return;
    }
    const controller = new AbortController(); active.current = controller;
    busy.current?.(true); setProgress(0); setError(""); setRetry([]);
    const remaining = [...selected];
    try {
      const token = await getSession();
      for (const file of selected) {
        if (controller.signal.aborted) break;
        setProgress(0);
        const result = await api.uploadAnswerFile(eventId, field.id, token, file, {
          signal: controller.signal, onProgress: (value) => { if (alive.current) setProgress(value); },
        });
        if (!alive.current || controller.signal.aborted) break;
        onChange((current) => [...current, result]); remaining.shift();
      }
    } catch (e) {
      if (alive.current) { setRetry(remaining); setError(controller.signal.aborted ? "Загрузка отменена." : e.message_ru || "Не удалось загрузить файл."); }
    } finally {
      if (alive.current) { active.current = null; setProgress(null); busy.current?.(false); }
    }
  };
  const remove = async (file) => {
    if (active.current || disabled) return;
    const controller = new AbortController(); active.current = controller; busy.current?.(true); setProgress(0);
    try {
      await api.removeAnswerFile(eventId, file.file_id, await getSession(), controller.signal);
      if (alive.current) { onChange((current) => current.filter((f) => f.file_id !== file.file_id)); setError(""); }
    } catch (e) { if (alive.current) setError(e.message_ru || "Не удалось удалить файл."); }
    finally { if (alive.current) { active.current = null; busy.current?.(false); setProgress(null); } }
  };
  return <div className="space-y-2">
    <p className="text-sm">{policy && filePolicyHint(policy)}</p>
    {!enabled && <p role="alert">Загрузка файлов временно недоступна. Обратитесь к организатору.</p>}
    {files.map((file) => <div key={file.file_id} className="flex gap-2 items-center text-sm">
      <span>{file.name} · {formatFileSize(file.size)}</span>
      <button type="button" className="btn btn-ghost" disabled={disabled || progress !== null} onClick={() => remove(file)}>Убрать</button>
    </div>)}
    <input type="file" multiple aria-label={`Файлы: ${field.title}`} disabled={!enabled || disabled || progress !== null}
      accept={policy?.allowed_extensions.map((ext) => `.${ext}`).join(',')}
      onChange={(e) => { const selected = Array.from(e.target.files || []); e.target.value = ''; upload(selected); }} />
    {progress !== null && <div role="status">{progress === 100 ? "Проверяем файл…" : `Загрузка: ${progress}%`}
      <button type="button" className="btn btn-ghost" onClick={() => active.current?.abort()}>Отменить</button>
    </div>}
    {retry.length > 0 && <button type="button" className="btn btn-ghost" disabled={disabled || progress !== null} onClick={() => upload(retry)}>Повторить загрузку</button>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
