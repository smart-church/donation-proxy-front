import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ReactQuill from "react-quill";
import { Plus, Edit3, Save, Trash2, X, ChevronLeft, MoreVertical } from "lucide-react";
import * as api from "../mock/api";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import SafeHtml from "../components/SafeHtml";
import { useApp } from "../components/AppContext";
import { formatDateShort } from "../lib/utils";

const quillModules = {
  toolbar: [["bold", "italic", "underline"], [{ list: "ordered" }, { list: "bullet" }], ["link"], ["clean"]],
};

const validateTemplate = (template) => {
  const errors = {};
  if (!template.name.trim()) errors.name = "Введите название шаблона.";
  if (!template.subject.trim()) errors.subject = "Введите тему письма.";
  if (!template.body.trim()) errors.body = "Введите текст письма.";
  return errors;
};

export default function MailTemplates() {
  const { eventId } = useParams();
  const { notify } = useApp();
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const reload = () => api.listTemplates(eventId).then(setRows);
  useEffect(() => { reload(); }, [eventId]);

  const deleteTemplate = async (tpl) => {
    await api.deleteTemplate(eventId, tpl.id);
    notify("Шаблон удалён", "success");
    reload();
    setConfirmDelete(null);
  };

  if (selected && !confirmDelete) return <TemplateView eventId={eventId} template={selected} onBack={() => { setSelected(null); reload(); }} />;

  const columns = [
    { key: "num", label: "#", width: "60px", render: (_, i) => i + 1 },
    {
      key: "name",
      label: "Название",
      sortable: true,
      render: (t) => (
        <button className="link font-medium" onClick={async () => setSelected(await api.getTemplate(eventId, t.id))} data-testid={`template-open-${t.id}`}>
          {t.name}
        </button>
      ),
    },
    { key: "subject", label: "Тема" },
    { key: "created_at", label: "Создан", render: (t) => formatDateShort(t.created_at) },
    {
      key: "actions",
      label: "Действия",
      width: "40px",
      render: (t) => (
        <div className="relative">
          <button
            className="btn btn-ghost !p-1"
            onClick={() => setMenuOpen(menuOpen === t.id ? null : t.id)}
            data-testid={`template-menu-${t.id}`}
          >
            <MoreVertical size={14} />
          </button>
          {menuOpen === t.id && (
            <div
              className="absolute right-0 mt-1 surface shadow-lg rounded-md p-1 z-10"
              style={{ minWidth: "140px" }}
            >
              <button
                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-[color:var(--bg-elev-2)] flex items-center gap-2"
                onClick={async () => {
                  setSelected(await api.getTemplate(eventId, t.id));
                  setMenuOpen(null);
                }}
                data-testid={`template-edit-${t.id}`}
              >
                <Edit3 size={12} /> Редактировать
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-[color:var(--bg-elev-2)] flex items-center gap-2"
                style={{ color: "var(--danger)" }}
                onClick={() => {
                  setConfirmDelete(t);
                  setMenuOpen(null);
                }}
                data-testid={`template-delete-${t.id}`}
              >
                <Trash2 size={12} /> Удалить
              </button>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-6xl">
      <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Почта &nbsp;›&nbsp; Шаблоны</div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-extrabold">Шаблоны писем</h1>
        <button className="btn btn-primary" onClick={() => setCreating(true)} data-testid="template-create-btn">
          <Plus size={14} /> Новый шаблон
        </button>
      </div>
      <DataTable columns={columns} rows={rows} testid="templates-table" />

      {creating && (
        <TemplateCreate
          eventId={eventId}
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); reload(); notify("Шаблон создан", "success"); }}
        />
      )}

      {confirmDelete && (
        <Modal
          open
          onClose={() => setConfirmDelete(null)}
          title="Удалить шаблон?"
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Отмена</button>
              <button className="btn btn-danger" onClick={() => deleteTemplate(confirmDelete)}>Удалить</button>
            </>
          }
        >
          <p className="text-sm">Действие нельзя отменить. Шаблон «{confirmDelete.name}» будет удалён.</p>
        </Modal>
      )}
    </div>
  );
}

function TemplateCreate({ eventId, onClose, onCreated }) {
  const { notify } = useApp();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const save = async () => {
    const validationErrors = validateTemplate({ name, subject, body });
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      await api.createTemplate(eventId, { name: name.trim(), subject: subject.trim(), body });
      onCreated();
    } catch (error) {
      notify(error.message_ru || "Не удалось создать шаблон", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Новый шаблон"
      size="lg"
      testid="template-create-modal"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" disabled={!name || saving} onClick={save} data-testid="template-create-save">
            {saving ? <span className="spinner" /> : <Save size={14} />} Создать
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="label">Название</label>
          <input className={`input ${errors.name ? "error" : ""}`} value={name} maxLength={255} onChange={(e) => { setName(e.target.value); setErrors({ ...errors, name: "" }); }} data-testid="template-name" />
          {errors.name && <div className="text-xs mt-1" role="alert" style={{ color: "var(--danger)" }}>{errors.name}</div>}
        </div>
        <div>
          <label className="label">Тема</label>
          <input className={`input ${errors.subject ? "error" : ""}`} value={subject} maxLength={255} onChange={(e) => { setSubject(e.target.value); setErrors({ ...errors, subject: "" }); }} />
          {errors.subject && <div className="text-xs mt-1" role="alert" style={{ color: "var(--danger)" }}>{errors.subject}</div>}
        </div>
        <div>
          <label className="label">Текст</label>
          <ReactQuill theme="snow" value={body} onChange={(value) => { setBody(value); setErrors({ ...errors, body: "" }); }} modules={quillModules} />
          {errors.body && <div className="text-xs mt-1" role="alert" style={{ color: "var(--danger)" }}>{errors.body}</div>}
        </div>
      </div>
    </Modal>
  );
}

function TemplateView({ eventId, template, onBack }) {
  const { notify } = useApp();
  const [tpl, setTpl] = useState(template);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errors, setErrors] = useState({});

  const save = async () => {
    const validationErrors = validateTemplate(tpl);
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      await api.updateTemplate(eventId, tpl.id, { name: tpl.name.trim(), subject: tpl.subject.trim(), body: tpl.body });
      setEditing(false);
      notify("Шаблон обновлён", "success");
    } catch (error) {
      notify(error.message_ru || "Не удалось обновить шаблон", "error");
    } finally {
      setSaving(false);
    }
  };
  const del = async () => {
    await api.deleteTemplate(eventId, tpl.id);
    notify("Шаблон удалён", "success");
    onBack();
  };

  return (
    <div className="max-w-3xl">
      <button className="btn btn-ghost mb-4" onClick={onBack}>
        <ChevronLeft size={14} /> К шаблонам
      </button>
      <div className="surface p-8 space-y-4">
        {editing ? (
          <>
            <div>
              <label className="label">Название</label>
              <input className={`input ${errors.name ? "error" : ""}`} value={tpl.name} maxLength={255} onChange={(e) => { setTpl({ ...tpl, name: e.target.value }); setErrors({ ...errors, name: "" }); }} />
              {errors.name && <div className="text-xs mt-1" role="alert" style={{ color: "var(--danger)" }}>{errors.name}</div>}
            </div>
            <div>
              <label className="label">Тема</label>
              <input className={`input ${errors.subject ? "error" : ""}`} value={tpl.subject} maxLength={255} onChange={(e) => { setTpl({ ...tpl, subject: e.target.value }); setErrors({ ...errors, subject: "" }); }} />
              {errors.subject && <div className="text-xs mt-1" role="alert" style={{ color: "var(--danger)" }}>{errors.subject}</div>}
            </div>
            <div>
              <label className="label">Текст</label>
              <ReactQuill theme="snow" value={tpl.body} onChange={(v) => { setTpl({ ...tpl, body: v }); setErrors({ ...errors, body: "" }); }} modules={quillModules} />
              {errors.body && <div className="text-xs mt-1" role="alert" style={{ color: "var(--danger)" }}>{errors.body}</div>}
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold">{tpl.name}</h1>
            <div className="text-sm" style={{ color: "var(--text-dim)" }}>Тема: {tpl.subject}</div>
            <SafeHtml className="prose prose-sm max-w-none pt-2" html={tpl.body} />
          </>
        )}
        <div className="flex justify-end gap-2 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          {editing ? (
            <>
              <button className="btn btn-ghost" onClick={() => setEditing(false)}>Отмена</button>
              <button className="btn btn-primary" disabled={saving} onClick={save}>
                {saving ? <span className="spinner" /> : <Save size={14} />} Сохранить
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-outline-danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={14} /> Удалить
              </button>
              <button className="btn btn-primary" onClick={() => setEditing(true)}>
                <Edit3 size={14} /> Редактировать
              </button>
            </>
          )}
        </div>
      </div>
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Удалить шаблон?"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>Отмена</button>
            <button className="btn btn-danger" onClick={del}>Удалить</button>
          </>
        }
      >
        <p className="text-sm">Действие нельзя отменить. Шаблон «{tpl.name}» будет удалён.</p>
      </Modal>
    </div>
  );
}
