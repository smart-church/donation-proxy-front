import React from "react";
import AttachmentList from "./AttachmentList";
import FileUploader from "./FileUploader";

export default function MailAttachments({ eventId, files = [], onChange, onBusyChange, disabled = false }) {
  return <div className="space-y-3">
    <AttachmentList eventId={eventId} files={files} disabled={disabled}
      onRemove={onChange ? (id) => onChange((current) => current.filter((f) => f.file_id !== id)) : undefined} />
    {onChange && <FileUploader eventId={eventId} purpose="mail" files={files} disabled={disabled}
      onBusyChange={onBusyChange} onUploaded={(file) => onChange((current) => [...current, file])} />}
  </div>;
}
