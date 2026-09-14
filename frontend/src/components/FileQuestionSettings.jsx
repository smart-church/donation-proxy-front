import React, { useEffect, useState } from "react";
import * as api from "../mock/api";

export default function FileQuestionSettings({ eventId, value = {}, onChange, disabled }) {
  const [policy, setPolicy] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    api.getFileLimits(eventId).then((data) => { if (alive) setPolicy(data.purposes.answer); })
      .catch(() => { if (alive) setError("Не удалось загрузить ограничения файлов."); });
    return () => { alive = false; };
  }, [eventId]);
  if (!policy) return <p>{error || "Загружаем ограничения…"}</p>;
  return <div className="space-y-2">
    {[['max_files', 'Максимальное количество файлов', 1], ['max_file_bytes', 'Максимальный размер одного файла, МиБ', 1048576], ['max_total_bytes', 'Максимальный суммарный размер файлов, МиБ', 1048576]].map(([key, label, unit]) => <label key={key} className="label">{label}
      <input type="number" className="input" min={unit === 1 ? 1 : 0.1} step={unit === 1 ? 1 : 0.1}
        max={policy[key] / unit} disabled={disabled} value={(value[key] ?? policy[key]) / unit}
        onChange={(e) => onChange({ ...value, [key]: Math.round(Number(e.target.value) * unit) })} />
    </label>)}
    <p className="label">Допустимые расширения</p>
    <div className="flex flex-wrap gap-2">{policy.allowed_extensions.map((ext) => <label key={ext} className="text-sm">
      <input type="checkbox" disabled={disabled} checked={(value.allowed_extensions || policy.allowed_extensions).includes(ext)}
        onChange={(e) => onChange({ ...value, allowed_extensions: e.target.checked
          ? [...(value.allowed_extensions || policy.allowed_extensions), ext]
          : (value.allowed_extensions || policy.allowed_extensions).filter((item) => item !== ext) })} /> .{ext}
    </label>)}</div>
  </div>;
}
