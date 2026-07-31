// LocalStorage-backed mock store for Evman
// All data persists in the browser.
//
// NOTE ABOUT "SECRETS":
// The seed users below are NOT real credentials. This module powers a
// pure client-side mock of an event-registration backend. In a real
// deployment these seed accounts would live in the backend database
// and never appear in source code. They are configurable via
// REACT_APP_SEED_ADMIN_EMAIL / REACT_APP_SEED_ADMIN_PASSWORD (and the
// same *_MANAGER_* pair) to make testing easier without changing code.

const KEY = "evman.mock.v1";

const env = (typeof process !== "undefined" && process.env) || {};
const SEED_ADMIN_EMAIL = env.REACT_APP_SEED_ADMIN_EMAIL || "admin@evman.io";
const SEED_ADMIN_PASSWORD = env.REACT_APP_SEED_ADMIN_PASSWORD || "admin1234";
const SEED_MANAGER_EMAIL = env.REACT_APP_SEED_MANAGER_EMAIL || "manager@evman.io";
const SEED_MANAGER_PASSWORD = env.REACT_APP_SEED_MANAGER_PASSWORD || "manager1234";

const uid = () => Math.random().toString(36).slice(2, 10);

function now() {
  return new Date().toISOString();
}

function seed() {
  const eventId = "ev_" + uid();
  const templateId = "tpl_" + uid();
  return {
    session: null,
    users: [
      {
        id: "u_admin",
        email: SEED_ADMIN_EMAIL,
        password: SEED_ADMIN_PASSWORD,
        full_name: "Актан Ибраев",
        is_superuser: true,
      },
      {
        id: "u_manager",
        email: SEED_MANAGER_EMAIL,
        password: SEED_MANAGER_PASSWORD,
        full_name: "Мария Организатор",
        is_superuser: false,
      },
    ],
    admins: ["u_admin"],
    events: [
      {
        id: eventId,
        name: "Чистый тест для разработчиков",
        registration_open: true,
        auto_mail_enabled: false,
        success_template_id: null,
        description: "<p>Открытая встреча инженерного сообщества.</p>",
        success_form_description: "<p>Спасибо! Ваша заявка принята.</p>",
        fail_form_description: "<p>К сожалению, что-то пошло не так.</p>",
        closed_registration_description: "<p>Регистрация закрыта.</p>",
        created_at: now(),
        managers: ["u_admin", "u_manager"],
      },
    ],
    forms: {
      [eventId]: {
        fields: [
          {
            id: "f_" + uid(),
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
            id: "f_" + uid(),
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
      },
    },
    participants: {
      [eventId]: [],
    },
    mail: {
      [eventId]: [],
    },
    templates: {
      [eventId]: [
        {
          id: templateId,
          name: "Приветственное письмо",
          subject: "Спасибо за регистрацию!",
          body: "<p>Здравствуйте!</p><p>Ваша заявка принята. Мы свяжемся с вами позднее.</p>",
          created_at: now(),
        },
      ],
    },
    active_event_id: eventId,
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw);
  } catch (e) {
    const s = seed();
    localStorage.setItem(KEY, JSON.stringify(s));
    return s;
  }
}

function save(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

const store = {
  reset() {
    localStorage.removeItem(KEY);
    return load();
  },
  getState: load,
  setState(mutator) {
    const s = load();
    mutator(s);
    save(s);
    return s;
  },
  uid,
  now,
};

export default store;
