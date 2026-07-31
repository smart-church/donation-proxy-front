import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Eye,
  EyeOff,
  Settings,
  Check,
  X,
  ChevronRight,
} from "lucide-react";
import * as api from "../mock/api";

const FIELD_TYPES = [
  { value: "text", label: "Текст" },
  { value: "textarea", label: "Многострочный текст" },
  { value: "email", label: "Email" },
  { value: "full_name", label: "ФИО" },
  { value: "checkbox", label: "Чекбокс (мультивыбор)" },
  { value: "radio", label: "Radio (один вариант)" },
  { value: "date", label: "Дата" },
  { value: "filler", label: "Разделитель" },
];

export default function FormEdit() {
  const { eventId } = useParams();
  const [form, setForm] = useState({ fields: [] });
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved
  const timersRef = useRef({});

  useEffect(() => {
    api.getForm(eventId).then((f) => {
      setForm(f);
      setLoading(false);
    });
  }, [eventId]);

  const debounceSave = (fieldId, patch) => {
    setSaveStatus("saving");
    clearTimeout(timersRef.current[fieldId]);
    timersRef.current[fieldId] = setTimeout(async () => {
      await api.patchField(eventId, fieldId, patch);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1200);
    }, 700);
  };

  const patchLocal = (fieldId, patch) => {
    setForm((f) => ({
      ...f,
      fields: f.fields.map((x) => (x.id === fieldId ? { ...x, ...patch } : x)),
    }));
    debounceSave(fieldId, patch);
  };

  const addField = async () => {
    const { id } = await api.addField(eventId, { type: "text", title: "Новый вопрос" });
    const f = await api.getForm(eventId);
    setForm(f);
  };

  const move = async (fieldId, dir) => {
    await api.moveField(eventId, fieldId, dir);
    const f = await api.getForm(eventId);
    setForm(f);
  };

  const remove = async (fieldId) => {
    await api.removeField(eventId, fieldId);
    const f = await api.getForm(eventId);
    setForm(f);
  };

  const requiredCount = form.fields.filter((f) => f.required && !f.hidden).length;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
        Редактировать мероприятие &nbsp;›&nbsp; Анкета
      </div>

      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-3xl font-extrabold">Анкета участника</h1>
        <SaveIndicator status={saveStatus} />
      </div>
      <div className="text-sm mb-8" style={{ color: "var(--text-dim)" }}>
        {form.fields.length} поля{" "}
        <span style={{ color: "var(--brand)" }}>· {requiredCount} обязательных</span>
      </div>

      {loading ? (
        <div className="surface p-12 text-center" style={{ color: "var(--text-muted)" }}>
          <span className="spinner" /> Загрузка…
        </div>
      ) : (
        <div className="space-y-3">
          {form.fields.map((field, i) => (
            <FieldEditor
              key={field.id}
              field={field}
              index={i + 1}
              total={form.fields.length}
              onPatch={(p) => patchLocal(field.id, p)}
              onMove={(dir) => move(field.id, dir)}
              onRemove={() => remove(field.id)}
            />
          ))}
          <button
            data-testid="form-add-field"
            onClick={addField}
            className="w-full py-4 rounded-xl border-2 border-dashed transition-all font-semibold hover:bg-[color:var(--brand-soft)]"
            style={{ borderColor: "var(--brand)", color: "var(--brand)" }}
          >
            + Добавить поле
          </button>
        </div>
      )}
    </div>
  );
}

function SaveIndicator({ status }) {
  if (status === "saving")
    return (
      <span className="chip">
        <span className="spinner" /> Сохранение…
      </span>
    );
  if (status === "saved")
    return (
      <span className="chip chip-brand">
        <Check size={11} /> Сохранено
      </span>
    );
  return null;
}

function FieldEditor({ field, index, total, onPatch, onMove, onRemove }) {
  const [expanded, setExpanded] = useState(index === 1);
  const isProtected = field.type === "full_name" || field.type === "email";

  return (
    <div className="surface overflow-hidden" data-testid={`field-${field.id}`}>
      <div className="flex items-center justify-between px-4 py-3" style={{ background: "var(--bg-elev-2)" }}>
        <div className="flex items-center gap-3">
          <span
            className="w-7 h-7 rounded-md grid place-items-center text-xs font-bold border"
            style={{ borderColor: "var(--brand)", color: "var(--brand)" }}
          >
            {index}
          </span>
          <span className="font-semibold">{field.title || "Без названия"}</span>
          {field.required && <span className="chip chip-brand">Обязательно</span>}
          {field.hidden && <span className="chip">Скрыто</span>}
        </div>
        <div className="flex items-center gap-1">
          <span className="chip">{FIELD_TYPES.find((t) => t.value === field.type)?.label}</span>
          <button className="btn btn-ghost !py-1 !px-2" title="Выше" onClick={() => onMove("up")} disabled={index === 1}>
            <ChevronUp size={14} />
          </button>
          <button
            className="btn btn-ghost !py-1 !px-2"
            title="Ниже"
            onClick={() => onMove("down")}
            disabled={index === total}
          >
            <ChevronDown size={14} />
          </button>
          <button
            className="btn btn-ghost !py-1 !px-2"
            title="Скрыть"
            onClick={() => onPatch({ hidden: !field.hidden })}
          >
            {field.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          {!isProtected && (
            <button
              className="btn btn-ghost !py-1 !px-2"
              title="Удалить"
              onClick={onRemove}
              data-testid={`field-remove-${field.id}`}
            >
              <Trash2 size={14} />
            </button>
          )}
          <button className="btn btn-ghost !py-1 !px-2" onClick={() => setExpanded((v) => !v)}>
            <ChevronRight size={14} style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="grid md:grid-cols-2 divide-x" style={{ borderColor: "var(--border)" }}>
          {/* Preview */}
          <div className="p-5" style={{ borderColor: "var(--border)" }}>
            <div className="text-[11px] uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
              <Eye size={12} /> Предпросмотр
            </div>
            <FieldPreview field={field} />
          </div>
          {/* Settings */}
          <div className="p-5" style={{ borderColor: "var(--border)" }}>
            <div className="text-[11px] uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
              <Settings size={12} /> Настройки
            </div>
            <FieldSettings field={field} onPatch={onPatch} isProtected={isProtected} />
          </div>
        </div>
      )}
    </div>
  );
}

function FieldPreview({ field }) {
  if (field.type === "filler") {
    return (
      <div className="py-4">
        <div className="text-lg font-bold mb-1">{field.title}</div>
        {field.description && (
          <div className="text-sm" style={{ color: "var(--text-dim)" }}>
            {field.description}
          </div>
        )}
      </div>
    );
  }
  return (
    <div>
      <label className="text-sm font-semibold">
        {field.title} {field.required && <span style={{ color: "var(--danger)" }}>*</span>}
      </label>
      {field.description && (
        <div className="text-xs mt-1 mb-2" style={{ color: "var(--text-dim)" }}>
          {field.description}
        </div>
      )}
      <div className="mt-2">
        {field.type === "textarea" ? (
          <textarea disabled placeholder={field.placeholder} className="input" rows={3} />
        ) : field.type === "date" ? (
          <input type="date" disabled className="input" />
        ) : field.type === "checkbox" || field.type === "radio" ? (
          <div className="space-y-2">
            {(field.options || []).map((o, i) => (
              <label key={`${i}-${o}`} className="flex items-center gap-2 text-sm">
                <input type={field.type === "checkbox" ? "checkbox" : "radio"} disabled /> {o}
              </label>
            ))}
            {field.allow_other && (
              <label className="flex items-center gap-2 text-sm">
                <input type={field.type === "checkbox" ? "checkbox" : "radio"} disabled /> Другой…
              </label>
            )}
          </div>
        ) : (
          <input disabled placeholder={field.placeholder} className="input" />
        )}
      </div>
    </div>
  );
}

function FieldSettings({ field, onPatch, isProtected }) {
  const showOptions = field.type === "checkbox" || field.type === "radio";
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Заголовок поля</label>
          <input
            data-testid={`field-title-${field.id}`}
            className="input"
            value={field.title}
            onChange={(e) => onPatch({ title: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Тип</label>
          <select
            className="input"
            value={field.type}
            onChange={(e) => onPatch({ type: e.target.value })}
            disabled={isProtected}
          >
            {FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {field.type !== "filler" && (
        <div>
          <label className="label">Заполнитель</label>
          <input
            className="input"
            value={field.placeholder || ""}
            onChange={(e) => onPatch({ placeholder: e.target.value })}
          />
        </div>
      )}

      <div>
        <label className="label">Описание</label>
        <input
          className="input"
          value={field.description || ""}
          onChange={(e) => onPatch({ description: e.target.value })}
        />
      </div>

      {showOptions && (
        <div>
          <label className="label">Варианты ответа</label>
          <div className="space-y-2">
            {(field.options || []).map((o, i) => (
              <div key={`opt-${i}`} className="flex gap-2">
                <input
                  className="input"
                  value={o}
                  onChange={(e) => {
                    const arr = [...field.options];
                    arr[i] = e.target.value;
                    onPatch({ options: arr });
                  }}
                />
                <button
                  className="btn btn-ghost !py-1 !px-2"
                  onClick={() => {
                    const arr = field.options.filter((_, j) => j !== i);
                    onPatch({ options: arr });
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              className="btn btn-ghost !py-1 !text-xs"
              onClick={() => onPatch({ options: [...(field.options || []), "Новый вариант"] })}
            >
              <Plus size={12} /> Вариант
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm mt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!field.allow_other}
              onChange={(e) => onPatch({ allow_other: e.target.checked })}
            />
            «Другой» вариант
          </label>
        </div>
      )}

      {field.type !== "filler" && (
        <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "var(--border)" }}>
          <span className="text-sm" style={{ color: "var(--text-dim)" }}>Обязательное поле</span>
          <Toggle checked={!!field.required} onChange={(v) => onPatch({ required: v })} />
        </div>
      )}
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-colors"
      style={{ background: checked ? "var(--brand)" : "var(--bg-elev-2)", border: `1px solid var(--border)` }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
        style={{
          left: checked ? "22px" : "2px",
          background: checked ? "#04120b" : "var(--text-muted)",
        }}
      />
      <span
        className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold"
        style={{ color: "#04120b", opacity: checked ? 1 : 0 }}
      >
        Да
      </span>
    </button>
  );
}
