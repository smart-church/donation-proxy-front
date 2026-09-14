import { useEffect, useRef, useState } from "react";
import * as api from "../mock/api";

export default function useEditableForm(eventId, validateField, notify) {
  const [form, setForm] = useState({ fields: [] });
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [fieldErrors, setFieldErrors] = useState({});
  const [structureBusy, setStructureBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const context = useRef(null);

  useEffect(() => {
    const ctx = { alive: true, form: { fields: [] }, dirty: new Map(), uploads: new Set(),
      timers: new Map(), queue: Promise.resolve(true), abort: new AbortController(), locked: false };
    context.current = ctx;
    setLoading(true); setFieldErrors({}); setSaveStatus("idle"); setUploading(false); setStructureBusy(false);
    api.getForm(eventId, ctx.abort.signal).then((data) => {
      if (ctx.alive) { ctx.form = data; setForm(data); setLoading(false); }
    }).catch((error) => { if (ctx.alive) { setLoading(false); notify(error.message_ru || "Не удалось загрузить анкету", "error"); } });
    return () => {
      ctx.alive = false;
      ctx.timers.forEach(clearTimeout);
      ctx.abort.abort();
    };
  }, [eventId]); // notify is supplied by the current app context, not a reload trigger.

  const save = (ctx, id) => {
    ctx.queue = ctx.queue.then(async () => {
      if (!ctx.alive || !ctx.dirty.has(id)) return true;
      if (ctx.uploads.has(id)) return false;
      const field = ctx.form.fields.find((f) => f.id === id);
      if (!field) { ctx.dirty.delete(id); return true; }
      const revision = ctx.dirty.get(id);
      try {
        const error = validateField(field);
        if (error) throw new Error(error);
        await api.patchField(eventId, id, field, ctx.abort.signal);
        if (!ctx.alive) return false;
        if (ctx.dirty.get(id) === revision) {
          ctx.dirty.delete(id);
          setFieldErrors((current) => { const next = { ...current }; delete next[id]; return next; });
        }
        setSaveStatus(ctx.dirty.size || ctx.uploads.size ? "saving" : "saved");
        return true;
      } catch (error) {
        if (ctx.alive) {
          setSaveStatus("error");
          setFieldErrors((current) => ({ ...current, [id]: error.message_ru || error.message || "Не удалось сохранить вопрос" }));
        }
        return false;
      }
    });
    return ctx.queue;
  };
  const schedule = (ctx, id) => {
    clearTimeout(ctx.timers.get(id));
    if (!ctx.uploads.has(id)) ctx.timers.set(id, setTimeout(() => save(ctx, id), 700));
  };
  const patchLocal = (id, patch) => {
    const ctx = context.current;
    if (!ctx?.alive || ctx.locked || ctx.form.registration_started) return;
    const field = ctx.form.fields.find((f) => f.id === id);
    if (!field) return;
    const next = { ...field, ...(typeof patch === "function" ? patch(field) : patch) };
    ctx.form = { ...ctx.form, fields: ctx.form.fields.map((f) => f.id === id ? next : f) };
    ctx.dirty.set(id, (ctx.dirty.get(id) || 0) + 1);
    setForm(ctx.form); setSaveStatus("saving");
    schedule(ctx, id);
  };
  const onUploadBusy = (id, busy) => {
    const ctx = context.current;
    if (!ctx?.alive) return;
    if (busy) { ctx.uploads.add(id); clearTimeout(ctx.timers.get(id)); }
    else { ctx.uploads.delete(id); if (ctx.dirty.has(id)) schedule(ctx, id); }
    setUploading(ctx.uploads.size > 0);
  };
  const changeStructure = async (kind, id, direction) => {
    const ctx = context.current;
    if (!ctx?.alive || ctx.locked || ctx.uploads.size || ctx.form.registration_started) return;
    ctx.locked = true; setStructureBusy(true);
    ctx.timers.forEach(clearTimeout);
    if (kind === "remove") ctx.dirty.delete(id);
    try {
      await ctx.queue;
      for (const fieldId of [...ctx.dirty.keys()]) {
        if (!await save(ctx, fieldId)) return;
      }
      if (!ctx.alive) return;
      if (kind === "add") await api.addField(eventId, { type: "text", title: "Новый вопрос", resources: [] });
      if (kind === "move") await api.moveField(eventId, id, direction);
      if (kind === "remove") await api.removeField(eventId, id);
      const data = await api.getForm(eventId, ctx.abort.signal);
      if (ctx.alive) { ctx.form = data; setForm(data); setSaveStatus("saved"); }
    } catch (error) {
      if (ctx.alive) notify(error.message_ru || "Не удалось изменить анкету", "error");
    } finally {
      ctx.locked = false;
      if (ctx.alive) setStructureBusy(false);
    }
  };
  const retry = (id) => {
    const ctx = context.current;
    if (ctx?.alive) save(ctx, id);
  };
  return { form, loading, saveStatus, fieldErrors, structureBusy, uploading, patchLocal, onUploadBusy,
    addField: () => changeStructure("add"), move: (id, direction) => changeStructure("move", id, direction),
    remove: (id) => changeStructure("remove", id), retry };
}
