import React, { useEffect, useRef, useState } from 'react';
import * as api from '../mock/api';
import Modal from './Modal';

export default function ParticipantCreate({ eventId, formFields, onClose, onCreated }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const pending = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const close = () => { if (!pending.current) onClose(); };
  const save = async (event) => {
    event.preventDefault();
    if (pending.current) return;
    const validation = {};
    if (!fullName.trim()) validation.full_name = 'Введите ФИО.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) validation.email = 'Введите корректный email.';
    setErrors(validation); setError('');
    if (Object.keys(validation).length) return;
    pending.current = true; setSaving(true);
    try {
      const participant = await api.createParticipant(eventId, { full_name: fullName.trim(), email: email.trim() }, formFields);
      if (alive.current) onCreated(participant);
    } catch (err) {
      if (alive.current) {
        setErrors(err.field_errors || {});
        setError(err.message_ru || 'Не удалось добавить участника. Повторите попытку.');
      }
    } finally {
      pending.current = false;
      if (alive.current) setSaving(false);
    }
  };
  return <Modal open title="Добавить участника" onClose={close} testid="participant-create-modal" footer={<>
    <button type="button" className="btn btn-ghost" disabled={saving} onClick={close}>Отмена</button>
    <button type="submit" form="participant-create-form" className="btn btn-primary" disabled={saving} data-testid="participant-create-submit">
      {saving ? <><span className="spinner" /> Сохраняем…</> : 'Добавить'}
    </button>
  </>}>
    <form id="participant-create-form" onSubmit={save} noValidate className="space-y-4">
      <label className="label">ФИО
        <input autoFocus className="input" name="full_name" value={fullName} maxLength={255} required disabled={saving}
          aria-invalid={!!errors.full_name} onChange={(e) => setFullName(e.target.value)} />
        {errors.full_name && <span className="text-sm" role="alert">{errors.full_name}</span>}
      </label>
      <label className="label">Email
        <input className="input" type="email" name="email" value={email} maxLength={255} required disabled={saving}
          aria-invalid={!!errors.email} onChange={(e) => setEmail(e.target.value)} />
        {errors.email && <span className="text-sm" role="alert">{errors.email}</span>}
      </label>
      <p className="text-sm">Остальные текстовые ответы можно заполнить в карточке участника. Автоматическое письмо при ручном добавлении не отправляется.</p>
      {error && <p role="alert" className="text-sm">{error}</p>}
    </form>
  </Modal>;
}
