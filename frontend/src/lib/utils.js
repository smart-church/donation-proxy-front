import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...args) {
  return twMerge(clsx(args));
}

// Human-readable Russian date: "20:30:52 12 декабря 2026 (5 дней назад)"
const MONTHS_RU = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

function pad(n) {
  return String(n).padStart(2, "0");
}

function plural(n, forms) {
  const abs = Math.abs(n) % 100;
  const n1 = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (n1 > 1 && n1 < 5) return forms[1];
  if (n1 === 1) return forms[0];
  return forms[2];
}

export function formatRelative(from) {
  const then = new Date(from);
  const now = new Date();
  const diffMs = now - then;
  const s = Math.floor(diffMs / 1000);
  if (s < 5) return "только что";
  if (s < 60) return `${s} ${plural(s, ["секунду", "секунды", "секунд"])} назад`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} ${plural(m, ["минуту", "минуты", "минут"])} назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ${plural(h, ["час", "часа", "часов"])} назад`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} ${plural(d, ["день", "дня", "дней"])} назад`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} ${plural(mo, ["месяц", "месяца", "месяцев"])} назад`;
  const y = Math.floor(mo / 12);
  return `${y} ${plural(y, ["год", "года", "лет"])} назад`;
}

export function formatDateFull(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const date = `${d.getDate()} ${MONTHS_RU[d.getMonth()]} ${d.getFullYear()}`;
  const rel = formatRelative(iso);
  return `${time} ${date} (${rel})`;
}

export function formatDateShort(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// theme
const THEME_KEY = "evman.theme";
export function getTheme() {
  return localStorage.getItem(THEME_KEY) || "dark";
}
export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
}
