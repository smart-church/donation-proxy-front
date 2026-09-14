import React, { useId, useState } from "react";
import * as api from "../mock/api";
import FileUploader from "./FileUploader";
import { ChevronRight } from "lucide-react";

export function ResourceList({ resources = [], eventId, publicView = false }) {
  const [error, setError] = useState("");
  const download = async (file) => {
    try { await api.downloadFile(eventId, file); setError(""); }
    catch (e) { setError(e.message_ru || "Не удалось скачать файл."); }
  };
  return <div className="space-y-1 my-2">
    {resources.map((resource, i) => <div key={resource.id || resource.file_id || i} className="text-sm">
      {resource.file_id ? (publicView
        ? <a className="link" href={api.resourceDownloadUrl(eventId, resource.id)}>{resource.title || resource.file?.name || "Скачать файл"}</a>
        : <button type="button" className="link" onClick={() => download(resource.file)}>{resource.title || resource.file?.name || "Скачать файл"}</button>)
        : /^https?:\/\//i.test(resource.url || "") && <a className="link" href={resource.url} target="_blank" rel="noopener noreferrer">{resource.title || resource.url}</a>}
    </div>)}
    {error && <p role="alert">{error}</p>}
  </div>;
}

export default function FormResources({ eventId, resources = [], onChange, onBusyChange, disabled }) {
  const [expanded, setExpanded] = useState(true);
  const contentId = useId();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const addLink = () => {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      if (resources.length >= 20) throw new Error();
      onChange((current) => [...current, { url: parsed.href, title: "" }]);
      setUrl(""); setError("");
    } catch { setError("Введите ссылку http:// или https://. Допускается до 20 материалов."); }
  };
  const move = (index, delta) => onChange((current) => {
    const next = [...current];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    return next;
  });
  return <section className="space-y-2 border-t pt-3 mt-3" style={{ borderColor: "var(--border)" }}>
    <div className="flex items-center justify-between">
      <h3 className="font-semibold">Материалы к вопросу</h3>
      <button type="button" className="btn btn-ghost !py-1 !px-2"
        aria-label={expanded ? "Свернуть материалы" : "Развернуть материалы"}
        aria-expanded={expanded} aria-controls={contentId} onClick={() => setExpanded((value) => !value)}>
        <ChevronRight size={14} style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
      </button>
    </div>
    <div id={contentId} hidden={!expanded} className="space-y-2">
      {resources.map((resource, index) => <div key={resource.id || resource.file_id || index} className="space-y-2">
        <div className="min-w-0 break-all">
          <ResourceList eventId={eventId} resources={[{ ...resource, title: "" }]} />
        </div>
        <input className="input min-w-0" aria-label={`Подпись материала ${index + 1}`} placeholder="Подпись (необязательно)"
          disabled={disabled} maxLength={255} value={resource.title || ""}
          onChange={(e) => { const value = e.target.value; onChange((current) => current.map((item, i) => i === index ? { ...item, title: value } : item)); }} />
        <div className="flex justify-end gap-1">
        <button type="button" className="btn btn-ghost" title="Материал выше" disabled={disabled || index === 0} onClick={() => move(index, -1)}>↑</button>
        <button type="button" className="btn btn-ghost" title="Материал ниже" disabled={disabled || index === resources.length - 1} onClick={() => move(index, 1)}>↓</button>
        <button type="button" className="btn btn-ghost" title="Удалить материал" disabled={disabled} onClick={() => onChange((current) => current.filter((_, i) => i !== index))}>×</button>
        </div>
      </div>)}
      {!disabled && <>
        <div className="flex gap-2">
          <input className="input" aria-label="Ссылка на материал" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
          <button type="button" className="btn btn-ghost" onClick={addLink}>Добавить ссылку</button>
        </div>
        <FileUploader eventId={eventId} purpose="resource" files={resources.filter((r) => r.file_id).map((r) => r.file)}
          disabled={resources.length >= 20} onBusyChange={onBusyChange}
          onUploaded={(file) => onChange((current) => [...current, { file_id: file.file_id, file, title: "" }])} />
      </>}
      {error && <p role="alert">{error}</p>}
    </div>
  </section>;
}
