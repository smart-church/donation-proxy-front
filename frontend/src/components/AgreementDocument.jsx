import React, { useState } from "react";
import * as api from "../mock/api";

export default function AgreementDocument({ eventId, publicView = false, disabled = false }) {
  const [error, setError] = useState("");
  const download = async () => {
    if (disabled) return;
    try { await api.downloadAgreement(eventId, { publicView }); setError(""); }
    catch (err) { setError(err.message_ru || "Не удалось скачать согласие."); }
  };
  return <div className="text-sm my-2">
    <button type="button" className="link" disabled={disabled} onClick={download}>Согласие на обработку персональных данных.pdf</button>
    {disabled && <p style={{ color: "var(--text-muted)" }}>Документ доступен после сохранения всех изменений анкеты.</p>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
