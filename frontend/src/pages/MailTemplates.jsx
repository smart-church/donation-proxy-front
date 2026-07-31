import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ReactQuill from "react-quill";
import { Plus, Edit3, Save, Trash2, X, ChevronLeft } from "lucide-react";
import * as api from "../mock/api";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import SafeHtml from "../components/SafeHtml";
import { useApp } from "../components/AppContext";
import { formatDateShort } from "../lib/utils";

const quillModules = {
  toolbar: [["bold", "italic", "underline"], [{ list: "ordered" }, { list: "bullet" }], ["link"], ["clean"]],
};

export default function MailTemplates() {
  const { eventId } = useParams();
  const { notify } = useApp();
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);

  const reload = () => api.listTemplates(eventId).then(setRows);
  useEffect(() => { reload(); }, [eventId]);

  if (selected) return <TemplateView eventId={eventId} template={selected} onBack={() => { setSelected(null); reload(); }} />;

  const columns = [
    { key: "num", label: "#", width: "60px", render: (_, i) => i + 1 },
    {
      key: "name",
      label: "Название",
      sortable: true,
      render: (t) => (
        <button className="link font-medium" onClick={() => setSelected(t)} data-testid={`template-open-${t.id}`}>
          {t.name}
        </button>
      ),
    },
    { key: "subject", label: "Тема" },
    { key: "created_at", label: "Создан", render: (t) => formatDateShort(t.created_at) },
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
    </div>
  );
}

function TemplateCreate({ eventId, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await api.createTemplate(eventId, { name, subject, body });
    setSaving(false);
    onCreated();
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
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} data-testid="template-name" />
        </div>
        <div>
          <label className="label">Тема</label>
          <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <label className="label">Текст</label>
          <ReactQuill theme="snow" value={body} onChange={setBody} modules={quillModules} />
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

  const save = async () => {
    setSaving(true);
    await api.updateTemplate(eventId, tpl.id, { name: tpl.name, subject: tpl.subject, body: tpl.body });
    setSaving(false);
    setEditing(false);
    notify("Шаблон обновлён", "success");
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
              <input className="input" value={tpl.name} onChange={(e) => setTpl({ ...tpl, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Тема</label>
              <input className="input" value={tpl.subject} onChange={(e) => setTpl({ ...tpl, subject: e.target.value })} />
            </div>
            <div>
              <label className="label">Текст</label>
              <ReactQuill theme="snow" value={tpl.body} onChange={(v) => setTpl({ ...tpl, body: v })} modules={quillModules} />
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
