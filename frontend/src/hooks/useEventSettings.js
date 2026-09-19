import { useEffect, useRef, useState } from "react";
import * as api from "../mock/api";

const validate = (event) => {
  const errors = {};
  if (!event.name.trim()) errors.title = "Введите название мероприятия.";
  if (event.auto_mail_enabled && !event.success_template_id) {
    errors.success_form_template = "Выберите шаблон письма для автоматической отправки.";
  }
  return errors;
};

export default function useEventSettings(eventId, notify) {
  const [ev, setEv] = useState(null);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const context = useRef(null);
  const notifyRef = useRef(notify);
  notifyRef.current = notify;

  useEffect(() => {
    const ctx = { alive: true, stopped: false, event: null, saved: "", pending: null };
    context.current = ctx;
    setEv(null); setErrors({}); setStatus("idle");
    const dirty = () => ctx.event && JSON.stringify(ctx.event) !== ctx.saved;
    ctx.flush = () => {
      if (ctx.stopped) return Promise.resolve(false);
      if (ctx.pending) return ctx.pending;
      if (!dirty()) return Promise.resolve(true);
      ctx.pending = (async () => {
        while (dirty() && !ctx.stopped) {
          const draft = ctx.event;
          const snapshot = JSON.stringify(draft);
          const validationErrors = validate(draft);
          if (Object.keys(validationErrors).length) {
            if (ctx.alive) { setErrors(validationErrors); setStatus("error"); }
            else notifyRef.current("Параметры не сохранены: исправьте ошибки в форме мероприятия.", "error");
            return false;
          }
          if (ctx.alive) { setStatus("saving"); setErrors({}); }
          try {
            await api.updateEvent(eventId, draft);
            ctx.saved = snapshot;
          } catch (error) {
            const fields = error.field_errors || {};
            if (ctx.alive) {
              setErrors({
                title: fields.title || fields.name,
                success_form_template: fields.success_form_template,
                general: fields.title || fields.name || fields.success_form_template
                  ? "" : error.message_ru || "Не удалось сохранить параметры. Повторим автоматически.",
              });
              setStatus("error");
            } else notifyRef.current(error.message_ru || "Не удалось сохранить параметры мероприятия.", "error");
            return false;
          }
        }
        if (ctx.alive && !ctx.stopped) setStatus("saved");
        return !ctx.stopped;
      })().finally(() => { ctx.pending = null; });
      return ctx.pending;
    };
    api.getEvent(eventId).then((event) => {
      if (!ctx.alive) return;
      ctx.event = event; ctx.saved = JSON.stringify(event); setEv(event);
    }).catch((error) => {
      if (ctx.alive) setErrors({ general: error.message_ru || "Не удалось загрузить мероприятие." });
    });
    const timer = setInterval(ctx.flush, 3000);
    const beforeUnload = (event) => {
      if (!ctx.stopped && dirty()) {
        void ctx.flush();
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const onHidden = () => { if (document.visibilityState === "hidden") void ctx.flush(); };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      ctx.alive = false;
      clearInterval(timer);
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("visibilitychange", onHidden);
      void ctx.flush();
    };
  }, [eventId]);

  const patch = (changes, saved = false) => {
    const ctx = context.current;
    if (!ctx?.event || ctx.stopped) return;
    ctx.event = { ...ctx.event, ...changes };
    if (saved) ctx.saved = JSON.stringify({ ...JSON.parse(ctx.saved), ...changes });
    setEv(ctx.event);
    setErrors({});
    setStatus(JSON.stringify(ctx.event) === ctx.saved ? "saved" : "pending");
  };
  const save = () => context.current.flush();
  const stop = async () => {
    const ctx = context.current;
    ctx.stopped = true;
    await ctx.pending;
  };
  const resume = () => { context.current.stopped = false; };
  return { ev, patch, errors, setErrors, status, save, stop, resume };
}
