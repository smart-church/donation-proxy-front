// Mock API layer — imitates a backend using localStorage.
// All calls are async and return small delays to simulate network.
import store from "./store";

const wait = (ms = 220) => new Promise((r) => setTimeout(r, ms));

const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: "Неверные данные",
  EVENT_ALREADY_EXISTS: "Мероприятие с таким именем уже существует",
  EVENT_NOT_FOUND: "Мероприятие не найдено",
  FIELD_NAME_UNIQUE: "Такое поле уже существует",
  MISSING_REQUIRED_FIELDS: "Не все обязательные поля заполнены",
  MANAGER_ALREADY_EXISTS: "Пользователь уже является организатором",
  CANNOT_REMOVE_SUPERUSER: "Нельзя удалить суперпользователя",
  TEMPLATE_NOT_FOUND: "Шаблон не найден",
  WRONG_PASSWORD: "Текущий пароль неверный",
};

function apiError(code) {
  const err = new Error(ERROR_MESSAGES[code] || code);
  err.code = code;
  err.message_ru = ERROR_MESSAGES[code] || code;
  return err;
}

// ---------- AUTH ----------
export async function login({ email, password }) {
  await wait();
  const s = store.getState();
  const user = s.users.find(
    (u) => u.email.toLowerCase() === (email || "").toLowerCase() && u.password === password
  );
  if (!user) throw apiError("INVALID_CREDENTIALS");
  const token = "mock-token." + user.id;
  store.setState((st) => {
    st.session = { user_id: user.id, token };
  });
  return { token, user: sanitize(user) };
}

export async function logout() {
  await wait(60);
  store.setState((st) => {
    st.session = null;
  });
  return { ok: true };
}

export async function getMe() {
  await wait(60);
  const s = store.getState();
  if (!s.session) throw apiError("UNAUTHORIZED");
  return sanitize(s.users.find((u) => u.id === s.session.user_id));
}

function sanitize(u) {
  if (!u) return null;
  const { password, ...rest } = u;
  return rest;
}

// ---------- EVENTS ----------
export async function listEvents() {
  await wait();
  const s = store.getState();
  return s.events.map((e) => ({
    ...e,
    participants_count: (s.participants[e.id] || []).length,
  }));
}

export async function getEvent(id) {
  await wait();
  const s = store.getState();
  const ev = s.events.find((e) => e.id === id);
  if (!ev) throw apiError("EVENT_NOT_FOUND");
  return ev;
}

export async function createEvent({ name }) {
  await wait();
  const s = store.getState();
  if (s.events.some((e) => e.name.trim().toLowerCase() === name.trim().toLowerCase())) {
    throw apiError("EVENT_ALREADY_EXISTS");
  }
  const id = "ev_" + store.uid();
  const now = store.now();
  store.setState((st) => {
    st.events.push({
      id,
      name: name.trim(),
      registration_open: false,
      auto_mail_enabled: false,
      success_template_id: null,
      description: "",
      success_form_description: "",
      fail_form_description: "",
      closed_registration_description: "",
      created_at: now,
      managers: [st.session?.user_id || "u_admin"],
    });
    st.forms[id] = {
      fields: [
        {
          id: "f_" + store.uid(),
          type: "full_name",
          title: "ФИО",
          placeholder: "Введите ФИО",
          description: "",
          required: true,
          hidden: false,
          options: [],
          allow_other: false,
        },
        {
          id: "f_" + store.uid(),
          type: "email",
          title: "Электронная почта",
          placeholder: "you@mail.com",
          description: "",
          required: true,
          hidden: false,
          options: [],
          allow_other: false,
        },
      ],
    };
    st.participants[id] = [];
    st.mail[id] = [];
    st.templates[id] = [];
    st.active_event_id = id;
  });
  return { id };
}

export async function updateEvent(id, patch) {
  await wait();
  const s = store.getState();
  const ev = s.events.find((e) => e.id === id);
  if (!ev) throw apiError("EVENT_NOT_FOUND");
  if (patch.name && s.events.some((e) => e.id !== id && e.name.trim().toLowerCase() === patch.name.trim().toLowerCase())) {
    throw apiError("EVENT_ALREADY_EXISTS");
  }
  store.setState((st) => {
    const target = st.events.find((e) => e.id === id);
    Object.assign(target, patch);
  });
  return { ok: true };
}

export async function deleteEvent(id) {
  await wait();
  store.setState((st) => {
    st.events = st.events.filter((e) => e.id !== id);
    delete st.forms[id];
    delete st.participants[id];
    delete st.mail[id];
    delete st.templates[id];
    if (st.active_event_id === id) st.active_event_id = st.events[0]?.id || null;
  });
  return { ok: true };
}

// ---------- FORM ----------
export async function getForm(eventId) {
  await wait(80);
  const s = store.getState();
  return s.forms[eventId] || { fields: [] };
}

export async function patchField(eventId, fieldId, patch) {
  await wait(120);
  store.setState((st) => {
    const f = st.forms[eventId].fields.find((x) => x.id === fieldId);
    if (f) Object.assign(f, patch);
  });
  return { ok: true };
}

export async function addField(eventId, field) {
  await wait(120);
  const id = "f_" + store.uid();
  store.setState((st) => {
    st.forms[eventId].fields.push({
      id,
      type: field?.type || "text",
      title: field?.title || "Новое поле",
      placeholder: field?.placeholder || "",
      description: "",
      required: false,
      hidden: false,
      options: field?.type === "checkbox" || field?.type === "radio" ? ["Вариант 1"] : [],
      allow_other: false,
    });
  });
  return { id };
}

export async function removeField(eventId, fieldId) {
  await wait(120);
  store.setState((st) => {
    st.forms[eventId].fields = st.forms[eventId].fields.filter((f) => {
      if (f.id !== fieldId) return true;
      if (f.type === "full_name" || f.type === "email") return true; // protected
      return false;
    });
  });
  return { ok: true };
}

export async function moveField(eventId, fieldId, direction) {
  await wait(80);
  store.setState((st) => {
    const arr = st.forms[eventId].fields;
    const i = arr.findIndex((f) => f.id === fieldId);
    if (i < 0) return;
    const j = direction === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  });
  return { ok: true };
}

// ---------- PARTICIPANTS ----------
export async function listParticipants(eventId) {
  await wait();
  const s = store.getState();
  return s.participants[eventId] || [];
}

export async function getParticipant(eventId, pid) {
  await wait();
  const s = store.getState();
  return (s.participants[eventId] || []).find((p) => p.id === pid);
}

export async function updateParticipant(eventId, pid, patch) {
  await wait();
  store.setState((st) => {
    const p = st.participants[eventId].find((x) => x.id === pid);
    if (p) Object.assign(p, patch);
  });
  return { ok: true };
}

export async function deleteParticipant(eventId, pid) {
  await wait();
  store.setState((st) => {
    st.participants[eventId] = st.participants[eventId].filter((p) => p.id !== pid);
  });
  return { ok: true };
}

export async function submitParticipant(eventId, data) {
  await wait();
  const s = store.getState();
  const form = s.forms[eventId];
  const required = form.fields.filter((f) => f.required && !f.hidden);
  const missing = required.find((f) => {
    const v = data[f.id];
    if (Array.isArray(v)) return v.length === 0;
    return !v || String(v).trim() === "";
  });
  if (missing) throw apiError("MISSING_REQUIRED_FIELDS");

  const id = "p_" + store.uid();
  const fullNameField = form.fields.find((f) => f.type === "full_name");
  const emailField = form.fields.find((f) => f.type === "email");
  const record = {
    id,
    event_id: eventId,
    status: "pending",
    answers: data,
    full_name: data[fullNameField?.id] || "",
    email: data[emailField?.id] || "",
    registered_at: store.now(),
    payment_date: null,
  };
  store.setState((st) => {
    st.participants[eventId].push(record);
  });
  return { id };
}

// ---------- MAIL ----------
export async function listMail(eventId) {
  await wait();
  const s = store.getState();
  return s.mail[eventId] || [];
}
export async function getMailItem(eventId, mid) {
  await wait();
  const s = store.getState();
  return (s.mail[eventId] || []).find((m) => m.id === mid);
}
export async function sendMail(eventId, { recipients, template_id, subject, body }) {
  await wait();
  const s = store.getState();
  let finalSubject = subject;
  let finalBody = body;
  if (template_id) {
    const tpl = (s.templates[eventId] || []).find((t) => t.id === template_id);
    if (tpl) {
      finalSubject = tpl.subject;
      finalBody = tpl.body;
    }
  }
  const id = "m_" + store.uid();
  store.setState((st) => {
    st.mail[eventId].push({
      id,
      recipients,
      template_id: template_id || null,
      subject: finalSubject,
      body: finalBody,
      sent_at: store.now(),
    });
  });
  return { id };
}

export async function mailSuggestions(eventId, query) {
  await wait(80);
  const s = store.getState();
  const q = (query || "").toLowerCase();
  return (s.participants[eventId] || [])
    .filter((p) => !q || p.email.toLowerCase().includes(q) || p.full_name.toLowerCase().includes(q))
    .slice(0, 8)
    .map((p) => ({ email: p.email, name: p.full_name }));
}

// ---------- TEMPLATES ----------
export async function listTemplates(eventId) {
  await wait();
  const s = store.getState();
  return s.templates[eventId] || [];
}
export async function getTemplate(eventId, tid) {
  await wait();
  const s = store.getState();
  return (s.templates[eventId] || []).find((t) => t.id === tid);
}
export async function createTemplate(eventId, data) {
  await wait();
  const id = "tpl_" + store.uid();
  store.setState((st) => {
    st.templates[eventId].push({
      id,
      name: data.name || "Новый шаблон",
      subject: data.subject || "",
      body: data.body || "",
      created_at: store.now(),
    });
  });
  return { id };
}
export async function updateTemplate(eventId, tid, patch) {
  await wait();
  store.setState((st) => {
    const t = st.templates[eventId].find((x) => x.id === tid);
    if (t) Object.assign(t, patch);
  });
  return { ok: true };
}
export async function deleteTemplate(eventId, tid) {
  await wait();
  store.setState((st) => {
    st.templates[eventId] = st.templates[eventId].filter((t) => t.id !== tid);
  });
  return { ok: true };
}

// ---------- MANAGERS / ADMINS ----------
export async function listManagers(eventId) {
  await wait();
  const s = store.getState();
  const ev = s.events.find((e) => e.id === eventId);
  if (!ev) return [];
  return ev.managers.map((id) => sanitize(s.users.find((u) => u.id === id))).filter(Boolean);
}
export async function addManager(eventId, userId) {
  await wait();
  store.setState((st) => {
    const ev = st.events.find((e) => e.id === eventId);
    if (ev && !ev.managers.includes(userId)) ev.managers.push(userId);
  });
  return { ok: true };
}
export async function removeManager(eventId, userId) {
  await wait();
  store.setState((st) => {
    const ev = st.events.find((e) => e.id === eventId);
    if (ev) ev.managers = ev.managers.filter((id) => id !== userId);
  });
  return { ok: true };
}

export async function listAdmins() {
  await wait();
  const s = store.getState();
  return s.admins.map((id) => sanitize(s.users.find((u) => u.id === id))).filter(Boolean);
}
export async function addAdmin(userId) {
  await wait();
  store.setState((st) => {
    if (!st.admins.includes(userId)) st.admins.push(userId);
  });
  return { ok: true };
}
export async function removeAdmin(userId) {
  await wait();
  const s = store.getState();
  const u = s.users.find((x) => x.id === userId);
  if (u?.is_superuser) throw apiError("CANNOT_REMOVE_SUPERUSER");
  store.setState((st) => {
    st.admins = st.admins.filter((id) => id !== userId);
  });
  return { ok: true };
}

export async function searchUsers(query) {
  await wait(80);
  const s = store.getState();
  const q = (query || "").toLowerCase();
  return s.users
    .filter((u) => u.email.toLowerCase().includes(q) || u.full_name.toLowerCase().includes(q))
    .map(sanitize);
}

// ---------- PROFILE ----------
export async function updateProfile(patch) {
  await wait();
  const s = store.getState();
  if (!s.session) throw apiError("UNAUTHORIZED");
  store.setState((st) => {
    const u = st.users.find((x) => x.id === st.session.user_id);
    if (u) {
      if (patch.email) u.email = patch.email;
      if (patch.full_name) u.full_name = patch.full_name;
    }
  });
  return { ok: true };
}
export async function updatePassword({ current, next }) {
  await wait();
  const s = store.getState();
  if (!s.session) throw apiError("UNAUTHORIZED");
  const u = s.users.find((x) => x.id === s.session.user_id);
  if (u.password !== current) throw apiError("WRONG_PASSWORD");
  store.setState((st) => {
    st.users.find((x) => x.id === st.session.user_id).password = next;
  });
  return { ok: true };
}
export async function getUserById(id) {
  await wait(60);
  const s = store.getState();
  return sanitize(s.users.find((u) => u.id === id));
}

export const ERRORS = ERROR_MESSAGES;
