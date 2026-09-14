import axios from "axios";

const TOKEN_KEY = "evman.api.token";
const LAST_EVENT_KEY = "evman.lastEvent";
const client = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "",
  withCredentials: true,
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
});

const API_ERROR_MESSAGES_RU = {
  IS_ADMIN: "Нельзя изменить права суперпользователя.",
  ALREADY_ADMIN: "Пользователь уже является администратором.",
  ALREADY_MANAGER: "Пользователь уже является организатором мероприятия.",
  LAST_MANAGER: "Нельзя удалить последнего организатора мероприятия.",
  UNEXPECTED_SCHEMA: "Проверьте правильность заполнения полей.",
  EMAIL_ALREADY_USED: "Этот email уже используется другим пользователем.",
  DUPLICATE_INVITE_EMAIL: "Один email указан в приглашении несколько раз.",
  INVALID_INVITE_TOKEN: "Ссылка приглашения недействительна или устарела.",
  PASSWORD_IS_NOT_CORRECT: "Текущий пароль указан неверно.",
  NEW_PASSWORD_DOES_NOT_MATCH: "Новый пароль и его подтверждение не совпадают.",
  NO_SUCH_FORM_FIELD: "Поле анкеты с таким порядковым номером не найдено.",
  SAME_ORDERS: "Нельзя переместить поле на ту же позицию.",
  BAD_ORDER: "Некорректная позиция поля анкеты.",
  NO_SUCH_FIELDS: "Не удалось найти поля анкеты для перемещения.",
  CANNOT_DELETE_KEY_FIELDS: "Поля «ФИО» и «Email» нельзя удалить.",
  CANNOT_CHANGE_KEY_FIELD_TYPE: "Тип полей «ФИО» и «Email» нельзя изменить.",
  CANNOT_CHANGE_REQUIRED_KEY_FIELD: "Поля «ФИО» и «Email» должны оставаться обязательными.",
  DUPLICATE_KEY_FIELD: "В анкете может быть только одно поле каждого системного типа.",
  REGISTRATION_ALREADY_STARTED: "Анкету нельзя изменять после запуска регистрации.",
  MAIL_NOT_FOUND: "Письмо не найдено.",
  TEMPLATE_NOT_FOUND: "Шаблон письма не найден.",
  DUPLICATE_RECEIVER: "Один получатель указан несколько раз.",
  INVALID_RECEIVER_BOTH: "Укажите получателя по идентификатору или email.",
  INVALID_RECEIVER_NONE: "Необходимо указать получателя.",
  PARTICIPANT_NOT_FOUND: "Участник мероприятия не найден.",
  NO_MAIL_CONTENT: "Выберите шаблон или заполните тему и текст письма.",
  TEMPLATE_AND_CONTENT: "Используйте либо шаблон, либо тему и текст письма.",
  TEMPLATE_NOT_IN_EVENT: "Выбранный шаблон не относится к этому мероприятию.",
  EMPTY_RECEIVERS: "Добавьте хотя бы одного получателя.",
  MAIL_QUEUE_UNAVAILABLE: "Сервис отправки писем временно недоступен.",
  REGISTRATION_CLOSED: "Регистрация на мероприятие закрыта.",
  THROTTLED: "Слишком много запросов. Попробуйте позже.",
  INVALID_JSON: "Не удалось прочитать отправленные данные.",
  UNSUPPORTED_MEDIA_TYPE: "Неподдерживаемый формат отправленных данных.",
};

const API_DETAIL_MESSAGES_RU = {
  "Required when automatic mail is enabled.": "Выберите шаблон письма для автоматической отправки.",
  "This field is required.": "Обязательное поле.",
  "This field may not be blank.": "Поле не может быть пустым.",
  "This list may not be empty.": "Список не может быть пустым.",
  "Enter a valid email address.": "Введите корректный email.",
  "Cannot parse request body.": "Проверьте правильность заполнения полей.",
  "Duplicate email in invite list.": "Один email указан в приглашении несколько раз.",
};

const getErrorDetail = (value) => {
  if (Array.isArray(value)) return getErrorDetail(value[0]);
  if (value && typeof value === "object") {
    if (value.details) return { message: String(value.details), code: value.code };
    if (value.detail) return getErrorDetail(value.detail);
    const firstValue = Object.values(value)[0];
    return firstValue === undefined ? {} : getErrorDetail(firstValue);
  }
  return value == null ? {} : { message: String(value) };
};

const translateApiError = (value, status) => {
  const { message, code } = getErrorDetail(value);
  if (code && API_ERROR_MESSAGES_RU[code]) return API_ERROR_MESSAGES_RU[code];
  if (message && API_DETAIL_MESSAGES_RU[message]) return API_DETAIL_MESSAGES_RU[message];
  if (message && /This password is too short/i.test(message)) return "Пароль слишком короткий.";
  if (message && /This password is too common/i.test(message)) return "Пароль слишком распространённый.";
  if (message && /This password is entirely numeric/i.test(message)) return "Пароль не должен состоять только из цифр.";
  if (message && /password is too similar/i.test(message)) return "Пароль слишком похож на данные пользователя.";
  if (message && /Ensure this field has no more than (\d+) characters/i.test(message)) {
    const limit = message.match(/(\d+)/)?.[1];
    return `Значение не должно превышать ${limit} символов.`;
  }
  if (message && /[А-Яа-яЁё]/.test(message)) return message;
  if (!status) return "Не удалось связаться с сервером.";
  if (status === 400) return "Проверьте правильность заполнения данных.";
  if (status === 401) return "Необходима авторизация.";
  if (status === 403) return "Недостаточно прав для выполнения действия.";
  if (status === 404) return "Запрошенные данные не найдены.";
  if (status === 409) return "Действие невозможно из-за текущего состояния данных.";
  if (status === 429) return "Слишком много запросов. Попробуйте позже.";
  if (status >= 500) return "Сервис временно недоступен.";
  return "Не удалось выполнить запрос.";
};

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
client.interceptors.response.use((r) => r, (error) => {
  const body = error.response?.data;
  const status = error.response?.status;
  const detail = getErrorDetail(body);
  error.code = body?.code || detail.code || status;
  error.field_errors = {};
  if (body && typeof body === "object" && !Array.isArray(body)) {
    Object.entries(body).forEach(([field, value]) => {
      if (!["code", "details", "detail"].includes(field)) {
        error.field_errors[field] = translateApiError(value, status);
      }
    });
  }
  error.message_ru = translateApiError(body, status);
  throw error;
});

const result = (r) => r.data;
const ok = () => ({ ok: true });
const userToView = (u) => {
  const privileges = u.privileges || [];
  const is_superuser = u.is_superuser ?? privileges.includes("superuser");
  const is_admin = u.is_staff ?? (privileges.includes("admin") || is_superuser);
  return { ...u, is_superuser, is_admin, full_name: [u.first_name, u.last_name].filter(Boolean).join(" "), role: is_admin ? "admin" : "organizer" };
};
const eventToView = (e) => ({ ...e, name: e.name ?? e.title, registration_open: e.is_active, auto_mail_enabled: e.use_auto_mail, success_template_id: e.success_form_template });
const eventToApi = (e) => ({ title: e.name, description: e.description, closed_registration_description: e.closed_registration_description, success_form_description: e.success_form_description, fail_form_description: e.fail_form_description, is_active: e.registration_open, use_auto_mail: e.auto_mail_enabled, success_form_template: e.success_template_id || null });
const fieldToView = (f) => ({ ...f, hidden: false, allow_other: f.has_custom_option });
const fieldToApi = (f) => ({ type: f.type, title: f.title, placeholder: f.placeholder || "", description: f.description || "", required: !!f.required, options: f.options || [], has_custom_option: !!f.allow_other, file_limits: f.type === "file" ? f.file_limits || {} : {}, ...(f.resources !== undefined ? { resources: f.resources.map((r) => ({ title: r.title || "", ...(r.file_id ? { file_id: r.file_id } : { url: r.url }) })) } : {}) });
const statusToView = { New: "pending", Accepted: "accepted", Rejected: "rejected" };
const statusToApi = { pending: "New", accepted: "Accepted", rejected: "Rejected" };
export const participantToView = (p, fields) => {
  const answers = {};
  for (const field of fields) {
    if (field.type === "full_name") answers[field.id] = p.full_name;
    else if (field.type === "email") answers[field.id] = p.email;
    else if (field.type === "file") answers[field.id] = (p.file_answers || []).find((answer) => String(answer.field_id) === String(field.id))?.files.map((file) => file.name) || [];
    else {
      const stored = (p.fields || []).find((item) => item.key === field.title)?.value ?? "";
      answers[field.id] = field.type === "checkbox" && stored ? stored.split(", ").filter(Boolean) : stored;
    }
  }
  return { ...p, status: statusToView[p.status] || p.status, answers };
};
export const participantToApi = (p, fields) => ({
  full_name: p.full_name,
  email: p.email,
  fields: fields.filter((field) => !["full_name", "email", "filler", "file"].includes(field.type)).map((field) => {
    const value = p.answers?.[field.id];
    return { key: field.title, value: Array.isArray(value) ? value.join(", ") : String(value ?? "") };
  }),
});

export async function login(credentials) { const r = await client.post("/api/v1/auth/login", credentials).then(result); localStorage.setItem(TOKEN_KEY, r.token); return { ...r, user: r.user ? userToView(r.user) : undefined }; }
export async function logout() { await client.post("/api/v1/auth/logout"); localStorage.removeItem(TOKEN_KEY); return ok(); }
export async function getMe() { return userToView(await client.get("/api/v1/profile").then(result)); }
export async function acceptInvite(payload) { await client.post("/api/auth/invite/reset", payload); return ok(); }

export async function listEvents() { const r = await client.get("/api/v1/events").then(result); return (Array.isArray(r) ? r : r.events || []).map(eventToView); }
export async function getEvent(id) {
  const event = await client.get(`/api/v1/events/${id}`).then(result);
  return eventToView({ ...event, id: event.id ?? Number(id) });
}
export async function createEvent({ name }) { const r = await client.post("/api/v1/events", { name }).then(result); return { id: r.event?.id ?? r.id }; }
export async function updateEvent(id, patch) { await client.post(`/api/v1/events/${id}`, eventToApi(patch)); return ok(); }
export async function deleteEvent(id) { await client.delete(`/api/v1/events/${id}`); return ok(); }
export async function approveEvent(id) { await client.patch(`/api/v1/events/${id}/approve`); return ok(); }
export async function disapproveEvent(id) { await client.patch(`/api/v1/events/${id}/disapprove`); return ok(); }

export async function getForm(eventId, signal) { const r = await client.get(`/api/v1/events/${eventId}/form`, { signal }).then(result); return { ...r, fields: (r.fields || []).map(fieldToView) }; }
export async function getPublicForm(eventId, signal) { const r = await client.get(`/api/v1/public/events/${eventId}/form`, { signal }).then(result); return { event: eventToView(r.event), fields: (r.fields || []).map(fieldToView) }; }
export async function patchField(eventId, fieldId, patch, signal) { const form = await getForm(eventId, signal); const field = form.fields.find((f) => String(f.id) === String(fieldId)); if (!field) throw new Error("Вопрос удалён"); await client.put(`/api/v1/events/${eventId}/form`, { order: field.order, field: fieldToApi({ ...field, ...patch }) }, { signal }); return ok(); }
export async function addField(eventId, field) { const form = await getForm(eventId); const order = form.fields.length + 1; await client.put(`/api/v1/events/${eventId}/form`, { order, field: fieldToApi({ type: "text", title: "Новое поле", ...field }) }); const updated = await getForm(eventId); return { id: updated.fields.find((f) => f.order === order)?.id }; }
export async function removeField(eventId, fieldId) { const form = await getForm(eventId); const field = form.fields.find((f) => String(f.id) === String(fieldId)); await client.delete(`/api/v1/events/${eventId}/form`, { data: { order: field.order } }); return ok(); }
export async function moveField(eventId, fieldId, direction) { const form = await getForm(eventId); const field = form.fields.find((f) => String(f.id) === String(fieldId)); await client.patch(`/api/v1/events/${eventId}/form`, { order_old: field.order, order_new: field.order + (direction === "up" ? -1 : 1) }); return ok(); }

// These screens filter, count and export locally, so they need the complete list.
async function getAllPages(url, key) {
  const pageSize = 100;
  const rows = [];
  const seen = new Set();
  for (let page = 1; ; page += 1) {
    const response = await client.get(url, { params: { page, page_size: pageSize } }).then(result);
    const items = response[key] || [];
    for (const item of items) {
      // New mail can shift page boundaries while the list is loading.
      if (!seen.has(item.id)) { rows.push(item); seen.add(item.id); }
    }
    if (items.length < pageSize) return rows;
  }
}

export async function listParticipants(eventId) {
  const [participants, form] = await Promise.all([
    getAllPages(`/api/v1/events/${eventId}/participants`, "participants"), getForm(eventId),
  ]);
  return participants.map((p) => participantToView(p, form.fields));
}
export async function getParticipant(eventId, id) { const [p, form] = await Promise.all([client.get(`/api/v1/events/${eventId}/participants/${id}`).then(result), getForm(eventId)]); return participantToView(p, form.fields); }
export async function updateParticipant(eventId, id, patch) { if (Object.keys(patch).length === 1 && patch.status) await client.patch(`/api/v1/events/${eventId}/participants/${id}`, { status: statusToApi[patch.status] || patch.status }); else { const form = await getForm(eventId); await client.put(`/api/v1/events/${eventId}/participants/${id}`, participantToApi(patch, form.fields)); } return ok(); }
export async function deleteParticipant(eventId, id) { await client.delete(`/api/v1/events/${eventId}/participants/${id}`); return ok(); }
export async function submitParticipant(eventId, answers, formFields, customValues = {}, uploadToken) {
  const fields = formFields.filter((f) => f.type !== "filler").map((f) => {
    const answer = { value: f.type === "file" ? (answers[f.id] || []).map((file) => file.file_id) : answers[f.id] ?? (f.type === "checkbox" ? [] : "") };
    if (Object.prototype.hasOwnProperty.call(customValues, f.id)) {
      answer.custom_value = customValues[f.id];
    }
    return answer;
  });
  await client.post(`/form/${eventId}/submit`, { fields }, { headers: uploadToken ? { "X-Form-Upload-Token": uploadToken } : {} });
  return ok();
}

const mailToView = (m) => ({ ...m, recipients: [m.receiver] });
export async function listMail(eventId) { const mails = await getAllPages(`/api/v1/events/${eventId}/mail`, "mails"); return mails.map(mailToView); }
export async function getMailItem(eventId, id) { const r = await client.get(`/api/v1/events/${eventId}/mail/${id}`).then(result); return mailToView(r.mail); }
export async function sendMail(eventId, { recipients, template_id, subject, body, attachment_ids, idempotency_key }) { const payload = { receivers: recipients.map((email) => ({ email })), attachment_ids }; if (template_id) payload.template = Number(template_id); else Object.assign(payload, { subject, body }); await client.post(`/api/v1/events/${eventId}/mail`, payload, { headers: idempotency_key ? { "Idempotency-Key": idempotency_key } : {} }); return ok(); }
export async function mailSuggestions(eventId, query) { const r = await client.get(`/api/v1/events/${eventId}/mail/suggestion`).then(result); const q = (query || "").toLowerCase(); return (r.receivers || []).filter((x) => !q || x.email.toLowerCase().includes(q) || x.full_name.toLowerCase().includes(q)).map((x) => ({ ...x, name: x.full_name })); }

export async function listTemplates(eventId) { const r = await client.get(`/api/v1/events/${eventId}/mail/template`).then(result); return r.templates || []; }
export async function getTemplate(eventId, id) { return client.get(`/api/v1/events/${eventId}/mail/template/${id}`).then(result); }
export async function createTemplate(eventId, payload) { return client.post(`/api/v1/events/${eventId}/mail/template`, payload).then(result); }
export async function updateTemplate(eventId, id, payload) { await client.put(`/api/v1/events/${eventId}/mail/template/${id}`, payload); return ok(); }
export async function deleteTemplate(eventId, id) { await client.delete(`/api/v1/events/${eventId}/mail/template/${id}`); return ok(); }

export async function listManagers(eventId) { const r = await client.get(`/api/v1/events/${eventId}/managers`).then(result); return (r.managers || []).map(userToView); }
export async function addManager(eventId, id) { await client.patch(`/api/v1/events/${eventId}/managers`, { user_id: Number(id) }); return ok(); }
export async function removeManager(eventId, id) { await client.delete(`/api/v1/events/${eventId}/managers`, { data: { user_id: Number(id) } }); return ok(); }
export async function listAdmins() { const r = await client.get("/api/v1/admins").then(result); return (r.admins || []).map(userToView); }
export async function addAdmin(id) { await client.patch("/api/v1/admins", { user_id: Number(id) }); return ok(); }
export async function removeAdmin(id) { await client.delete("/api/v1/admins", { data: { user_id: Number(id) } }); return ok(); }
export async function searchUsers(query) { const r = await client.get("/api/v1/profiles").then(result); const q = (query || "").toLowerCase(); return (r.users || []).map(userToView).filter((u) => u.email.toLowerCase().includes(q) || u.full_name.toLowerCase().includes(q)); }

export async function updateProfile(patch) { const [first_name = "", ...last] = (patch.full_name || "").trim().split(/\s+/); await client.patch("/api/v1/profile", { first_name, last_name: last.join(" "), email: patch.email }); return ok(); }
export async function updatePassword({ current, next }) { await client.patch("/api/v1/profile/password", { old_password: current, new_password: next, new_password_confirm: next }); localStorage.removeItem(TOKEN_KEY); return ok(); }
export async function getUserById() { return getMe(); }
export async function listUsers() { const r = await client.get("/api/v1/profiles").then(result); return (r.users || []).map(userToView); }
export async function inviteOrganizer(email) { await client.post("/api/v1/profiles/invite", { emails: [email] }); return ok(); }
export function getLastViewedEventId() { return localStorage.getItem(LAST_EVENT_KEY); }
export async function getLastViewedEvent() { const id = getLastViewedEventId(); return id ? getEvent(id) : null; }
export async function recordEventView(eventId) { localStorage.setItem(LAST_EVENT_KEY, String(eventId)); return ok(); }
export function clearLastViewedEvent() { localStorage.removeItem(LAST_EVENT_KEY); }
export const ERRORS = {};

// Shared file infrastructure. Mail/form attachment workflows are added in later stages.
export async function getFileLimits(eventId) {
  return client.get(`/api/v1/events/${eventId}/file/limits`).then(result);
}
export async function uploadFile(eventId, file, purpose, { signal, onProgress } = {}) {
  const data = new FormData();
  data.append("purpose", purpose);
  data.append("file", file);
  return client.post(`/api/v1/events/${eventId}/file`, data, {
    signal,
    onUploadProgress: (event) => onProgress?.(event.total ? Math.round(event.loaded * 100 / event.total) : 0),
  }).then(result);
}
export async function deleteUnusedFile(eventId, fileId) {
  await client.delete(`/api/v1/events/${eventId}/file/${fileId}`);
}
export async function downloadFile(eventId, file) {
  const response = await client.get(`/api/v1/events/${eventId}/file/${file.file_id}/download`, { responseType: "blob" });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const resourceDownloadUrl = (eventId, resourceId) => `${(client.defaults.baseURL || "").replace(/\/$/, "")}/api/v1/public/events/${eventId}/resources/${resourceId}/download`;


export async function createFormUploadSession(eventId, signal) {
  return client.post(`/api/v1/public/events/${eventId}/form/upload-sessions`, {}, { signal }).then(result);
}
export async function uploadAnswerFile(eventId, fieldId, token, file, { signal, onProgress } = {}) {
  const data = new FormData(); data.append('field_id', fieldId); data.append('file', file);
  return client.post(`/api/v1/public/events/${eventId}/form/uploads`, data, {
    headers: { 'X-Form-Upload-Token': token }, signal,
    onUploadProgress: (event) => onProgress?.(event.total ? Math.round(event.loaded * 100 / event.total) : 0),
  }).then(result);
}
export async function removeAnswerFile(eventId, fileId, token, signal) {
  return client.delete(`/api/v1/public/events/${eventId}/form/uploads/${fileId}`, {
    headers: { 'X-Form-Upload-Token': token }, signal,
  }).then(result);
}
