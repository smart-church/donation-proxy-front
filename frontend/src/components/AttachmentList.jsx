import React, { useState } from "react";
import * as api from "../mock/api";
import { formatFileSize } from "./FileUploader";

export default function AttachmentList({ eventId, files = [], onRemove, disabled = false }) {
  const [error, setError] = useState("");
  const download = async (file) => {
    try { setError(""); await api.downloadFile(eventId, file); }
    catch (e) { setError(e.message_ru || "Не удалось скачать файл. Попробуйте ещё раз."); }
  };
  return <div className="space-y-2">
    {files.map((file) => <div key={file.file_id} className="flex items-center gap-3 text-sm">
      <button type="button" className="link" onClick={() => download(file)}>{file.name}</button>
      <span>{formatFileSize(file.size)}</span>
      {onRemove && <button type="button" disabled={disabled} className="btn btn-ghost" onClick={() => onRemove(file.file_id)}>Убрать</button>}
    </div>)}
    {error && <p role="alert">{error}</p>}
  </div>;
}
