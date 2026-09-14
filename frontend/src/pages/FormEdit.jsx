import React, { useState } from "react";
import { useParams } from "react-router-dom";
import {
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Settings,
  Check,
  X,
  ChevronRight,
} from "lucide-react";
import FileQuestionSettings from "../components/FileQuestionSettings";
import useEditableForm from "../hooks/useEditableForm";
import FormResources, { ResourceList } from "../components/FormResources";
import { useApp } from "../components/AppContext";

const FIELD_TYPES = [
  { value: "text", label: "Текст" },
  { value: "file", label: "Загрузка файлов" },
  { value: "textarea", label: "Многострочный текст" },
  { value: "email", label: "Email" },
  { value: "full_name", label: "ФИО" },
  { value: "checkbox", label: "Чекбокс (мультивыбор)" },
  { value: "radio", label: "Radio (один вариант)" },
  { value: "date", label: "Дата" },
  { value: "filler", label: "Разделитель" },
];

const validateField = (field) => {
  if (!field.title.trim()) return "Введите заголовок поля.";
  if (field.title.length > 255) return "Заголовок не должен превышать 255 символов.";
  if ((field.placeholder || "").length > 255) return "Заполнитель не должен превышать 255 символов.";
  if (["checkbox", "radio"].includes(field.type) && (field.options || []).some((option) => !option.trim())) {
    return "Варианты ответа не должны быть пустыми.";
  }
  return "";
};

export default function FormEdit() {
  const { eventId } = useParams();
  const { notify } = useApp();
  const { form, loading, saveStatus, fieldErrors, structureBusy, uploading, patchLocal,
    onUploadBusy, addField, move, remove, retry } = useEditableForm(eventId, validateField, notify);

  const requiredCount = form.fields.filter((f) => f.required && !f.hidden).length;
  const isFormReadOnly = !!form.registration_started;

  // System fields that should not be duplicated
  const SYSTEM_FIELDS = ["email", "full_name"];
  
  // Get field types that are already used in the form
  const usedSystemFields = form.fields
    .map((f) => f.type)
    .filter((t) => SYSTEM_FIELDS.includes(t));

  // Get available field types for a given field (exclude already-used system fields)
  const getAvailableFieldTypes = (currentField) => {
    return FIELD_TYPES.filter(
      (t) =>
        // Participant uploads are temporarily disabled; keep existing file questions readable.
        (t.value !== "file" || currentField.type === "file") && (
        !SYSTEM_FIELDS.includes(t.value) || // Non-system fields are always available
        t.value === currentField.type || // Current type is always available
        !usedSystemFields.includes(t.value) // System fields available if not already used
        )
    );
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
        Редактировать мероприятие &nbsp;›&nbsp; Анкета
      </div>

      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-3xl font-extrabold">Анкета участника</h1>
        <SaveIndicator status={saveStatus} />
      </div>
      
      {isFormReadOnly && (
        <div className="mb-4 p-3 rounded-lg" style={{ background: "rgba(255, 193, 7, 0.1)", borderLeft: "4px solid #FFC107" }}>
          <p style={{ color: "#856404", fontSize: "14px", fontWeight: "500" }}>
            ⚠️ Редактирование анкеты невозможно. Регистрация уже запускалась.
          </p>
        </div>
      )}
      
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
              eventId={eventId}
              onUploadBusy={(busy) => onUploadBusy(field.id, busy)}
              onResourcesChange={(update) => patchLocal(field.id, (current) => ({ resources: update(current.resources || []) }))}
              structureDisabled={structureBusy || uploading}
              onRetry={() => retry(field.id)}
              index={i + 1}
              total={form.fields.length}
              onPatch={(p) => patchLocal(field.id, p)}
              onMove={(dir) => move(field.id, dir)}
              onRemove={() => remove(field.id)}
              disabled={isFormReadOnly || structureBusy}
              error={fieldErrors[field.id]}
              getAvailableFieldTypes={getAvailableFieldTypes}
            />
          ))}
          <button
            data-testid="form-add-field"
            onClick={addField}
            className="w-full py-4 rounded-xl border-2 border-dashed transition-all font-semibold hover:bg-[color:var(--brand-soft)]"
            style={{ borderColor: "var(--brand)", color: "var(--brand)" }}
            disabled={isFormReadOnly || structureBusy || uploading}
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
  if (status === "error")
    return <span className="chip chip-danger">Ошибка сохранения</span>;
  return null;
}

function FieldEditor({ eventId, onUploadBusy, onResourcesChange, structureDisabled, onRetry, field, index, total, onPatch, onMove, onRemove, disabled, error, getAvailableFieldTypes }) {
  const [expanded, setExpanded] = useState(index === 1);
  const isProtected = field.type === "full_name" || field.type === "email";

  return (
    <div className="surface overflow-hidden" data-testid={`field-${field.id}`} style={{ opacity: disabled ? 0.6 : 1 }}>
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
        </div>
        <div className="flex items-center gap-1">
          <span className="chip">{FIELD_TYPES.find((t) => t.value === field.type)?.label}</span>
          <button className="btn btn-ghost !py-1 !px-2" title="Выше" onClick={() => onMove("up")} disabled={index === 1 || disabled || structureDisabled}>
            <ChevronUp size={14} />
          </button>
          <button
            className="btn btn-ghost !py-1 !px-2"
            title="Ниже"
            onClick={() => onMove("down")}
            disabled={index === total || disabled || structureDisabled}
          >
            <ChevronDown size={14} />
          </button>
          {!isProtected && (
            <button
              className="btn btn-ghost !py-1 !px-2"
              title="Удалить"
              onClick={onRemove}
              data-testid={`field-remove-${field.id}`}
              disabled={disabled || structureDisabled}
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
              👁️ Предпросмотр
            </div>
            <FieldPreview field={field} eventId={eventId} />
          </div>
          {/* Settings */}
          <div className="p-5" style={{ borderColor: "var(--border)" }}>
            <div className="text-[11px] uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
              <Settings size={12} /> Настройки
            </div>
            {error && <button className="btn btn-ghost" disabled={disabled || structureDisabled} onClick={onRetry}>Повторить сохранение</button>}
            <FieldSettings eventId={eventId} field={field} onPatch={onPatch} isProtected={isProtected} disabled={disabled} error={error} getAvailableFieldTypes={getAvailableFieldTypes} />
            <FormResources eventId={eventId} resources={field.resources || []} onChange={onResourcesChange} onBusyChange={onUploadBusy} disabled={disabled} />
          </div>
        </div>
      )}
    </div>
  );
}

function FieldPreview({ field, eventId }) {
  if (field.type === "filler") {
    return (
      <div className="py-4">
        <div className="text-lg font-bold mb-1">{field.title}</div>
        {field.description && (
          <div className="text-sm" style={{ color: "var(--text-dim)" }}>
            {field.description}
          </div>
        )}
        <ResourceList eventId={eventId} resources={field.resources} />
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
      <ResourceList eventId={eventId} resources={field.resources} />
      <div className="mt-2">
        {field.type === "file" ? (
          <input type="file" disabled multiple className="input" />
        ) : field.type === "textarea" ? (
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

function FieldSettings({ eventId, field, onPatch, isProtected, disabled, error, getAvailableFieldTypes }) {
  const showOptions = field.type === "checkbox" || field.type === "radio";
  const showPlaceholder = !["filler", "checkbox", "radio", "file"].includes(field.type);
  const availableTypes = getAvailableFieldTypes ? getAvailableFieldTypes(field) : FIELD_TYPES;
  
  return (
    <div className="space-y-3">
      {error && <div className="text-xs" role="alert" style={{ color: "var(--danger)" }}>{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Заголовок поля</label>
          <input
            data-testid={`field-title-${field.id}`}
            className="input"
            value={field.title}
            onChange={(e) => onPatch({ title: e.target.value })}
            disabled={disabled}
            maxLength={255}
          />
        </div>
        <div>
          <label className="label">Тип</label>
          <select
            className="input"
            value={field.type}
            onChange={(e) => onPatch({ type: e.target.value })}
            disabled={isProtected || disabled}
          >
            {availableTypes.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {showPlaceholder && (
        <div>
          <label className="label">Заполнитель</label>
          <input
            className="input"
            value={field.placeholder || ""}
            onChange={(e) => onPatch({ placeholder: e.target.value })}
            disabled={disabled}
            maxLength={255}
          />
        </div>
      )}

      <div>
        <label className="label">Описание</label>
        <input
          className="input"
          value={field.description || ""}
          onChange={(e) => onPatch({ description: e.target.value })}
          disabled={disabled}
        />
      </div>

      {field.type === "file" && <FileQuestionSettings eventId={eventId} value={field.file_limits}
        onChange={(file_limits) => onPatch({ file_limits })} disabled={disabled} />}
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
                  disabled={disabled}
                />
                <button
                  className="btn btn-ghost !py-1 !px-2"
                  onClick={() => {
                    const arr = field.options.filter((_, j) => j !== i);
                    onPatch({ options: arr });
                  }}
                  disabled={disabled}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              className="btn btn-ghost !py-1 !text-xs"
              onClick={() => onPatch({ options: [...(field.options || []), "Новый вариант"] })}
              disabled={disabled}
            >
              <Plus size={12} /> Вариант
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm mt-2 cursor-pointer" style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? "none" : "auto" }}>
            <input
              type="checkbox"
              checked={!!field.allow_other}
              onChange={(e) => onPatch({ allow_other: e.target.checked })}
              disabled={disabled}
            />
            «Другой» вариант
          </label>
        </div>
      )}

      {field.type !== "filler" && (
        <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "var(--border)" }}>
          <span className="text-sm" style={{ color: "var(--text-dim)" }}>Обязательное поле</span>
          <Toggle checked={!!field.required} onChange={(v) => onPatch({ required: v })} disabled={disabled} />
        </div>
      )}
    </div>
  );
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-colors"
      style={{ background: checked ? "var(--brand)" : "var(--bg-elev-2)", border: `1px solid var(--border)`, opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
      disabled={disabled}
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
