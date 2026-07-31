import React, { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Calendar,
  Users,
  Mail,
  Send,
  Inbox,
  FileText,
  ClipboardList,
  Settings,
  UserCog,
  Shield,
  Sun,
  Moon,
  PlusCircle,
  ChevronRight,
} from "lucide-react";
import { useApp } from "./AppContext";
import * as api from "../mock/api";
import { cn } from "../lib/utils";

function useEventContext() {
  const location = useLocation();
  const [event, setEvent] = useState(null);

  // Match /events/:id/... or /participant/:pid (with ?event=...)
  const m = location.pathname.match(/^\/events\/([^/]+)/);
  let eventId = m ? m[1] : null;
  if (!eventId && location.pathname.startsWith("/participant/")) {
    const search = new URLSearchParams(location.search);
    eventId = search.get("event");
  }
  // Ignore "create" special path
  if (eventId === "create") eventId = null;

  useEffect(() => {
    if (!eventId) return setEvent(null);
    api.getEvent(eventId).then(setEvent).catch(() => setEvent(null));
  }, [eventId]);
  return { event, eventId };
}

function SideLink({ to, icon: Icon, label, end, testid }) {
  return (
    <NavLink
      to={to}
      end={end}
      data-testid={testid}
      className={({ isActive }) => cn("side-link", isActive && "active")}
    >
      <Icon size={16} strokeWidth={1.8} />
      <span>{label}</span>
    </NavLink>
  );
}

export default function Layout({ children }) {
  const { theme, setTheme, user, notify } = useApp();
  const { event, eventId } = useEventContext();
  const navigate = useNavigate();
  const location = useLocation();

  const logout = async () => {
    await api.logout();
    notify("Вы вышли из системы", "info");
    navigate("/login");
  };

  const eventScope = eventId ? `/events/${eventId}` : null;

  return (
    <div className="grain min-h-screen flex" style={{ background: "var(--bg)" }}>
      {/* Sidebar */}
      <aside
        className="w-[236px] shrink-0 flex flex-col border-r"
        style={{ background: "var(--sidebar)", borderColor: "var(--border)" }}
        data-testid="sidebar"
      >
        <div className="px-5 pt-5 pb-4 flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-md grid place-items-center"
            style={{ background: "var(--brand)", color: "#04120b" }}
          >
            <Calendar size={16} strokeWidth={2.4} />
          </div>
          <div className="font-extrabold tracking-tight text-[19px]">
            ev<span style={{ color: "var(--brand)" }}>man</span>
          </div>
        </div>

        <nav className="px-3 flex-1 overflow-y-auto pb-4">
          <div className="side-heading">Мероприятия</div>
          <SideLink to="/events" icon={ClipboardList} label="Список" testid="side-events-list" end />
          <SideLink to="/events/create" icon={PlusCircle} label="Создать" testid="side-events-create" />
          {eventScope && (
            <SideLink to={`${eventScope}/participants`} icon={Users} label="Участники" testid="side-participants" />
          )}

          <div className="side-heading">Почта</div>
          {eventScope ? (
            <>
              <SideLink to={`${eventScope}/mail/create`} icon={Send} label="Написать" testid="side-mail-create" />
              <SideLink to={`${eventScope}/mail`} icon={Inbox} label="Исходящие" testid="side-mail-outbox" />
              <SideLink
                to={`${eventScope}/mail-templates`}
                icon={FileText}
                label="Шаблоны писем"
                testid="side-mail-templates"
              />
            </>
          ) : (
            <div className="px-3 py-2 text-xs" style={{ color: "var(--text-muted)" }}>
              Выберите мероприятие
            </div>
          )}

          {eventScope && (
            <>
              <div className="side-heading">Редактировать мероприятие</div>
              <SideLink to={`${eventScope}/form/edit`} icon={ClipboardList} label="Анкета" testid="side-form-edit" />
              <SideLink to={`${eventScope}/managers`} icon={UserCog} label="Организаторы" testid="side-managers" />
              <SideLink to={`${eventScope}/edit`} icon={Settings} label="Параметры" testid="side-event-settings" />
            </>
          )}

          <div className="side-heading">Администрация</div>
          <SideLink to="/admins" icon={Shield} label="Администраторы" testid="side-admins" />
        </nav>

        {/* Theme toggle */}
        <div className="px-4 py-4 border-t" style={{ borderColor: "var(--border)" }}>
          <button
            data-testid="theme-toggle"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center gap-3 w-full group"
          >
            <div
              className="w-11 h-6 rounded-full relative transition-colors"
              style={{ background: theme === "dark" ? "var(--brand)" : "var(--bg-elev-2)" }}
            >
              <div
                className="absolute top-0.5 w-5 h-5 rounded-full transition-all grid place-items-center"
                style={{
                  left: theme === "dark" ? "22px" : "2px",
                  background: theme === "dark" ? "#04120b" : "#fff",
                  color: theme === "dark" ? "var(--brand)" : "#d18b1a",
                }}
              >
                {theme === "dark" ? <Moon size={11} /> : <Sun size={11} />}
              </div>
            </div>
            <span className="text-sm" style={{ color: "var(--text-dim)" }}>
              {theme === "dark" ? "Тёмная" : "Светлая"}
            </span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        {location.pathname !== "/login" && (
          <header
            className="h-16 shrink-0 flex items-center justify-between pl-6 pr-5 border-b"
            style={{ background: "var(--sidebar)", borderColor: "var(--border)" }}
            data-testid="header"
          >
            <div className="flex items-center gap-3">
              <div className="flex flex-col leading-tight">
                <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
                  Мероприятие
                </span>
                <span className="text-sm font-semibold" data-testid="header-event-name">
                  {event?.name || "— выберите —"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {user && (
                <button
                  data-testid="header-profile-btn"
                  onClick={() => navigate(`/profile/${user.id}`)}
                  className="btn btn-ghost !py-1.5 !text-xs"
                >
                  {user.email}
                  <ChevronRight size={14} />
                </button>
              )}
              <button data-testid="header-logout-btn" onClick={logout} className="btn btn-ghost !py-1.5 !text-xs">
                Выйти
              </button>
            </div>
          </header>
        )}

        <main className="flex-1 min-w-0 px-8 pt-6 pb-14 relative z-10">{children}</main>

        <footer
          className="px-8 py-4 border-t text-xs flex justify-between"
          style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
        >
          <span>Evman © 2026</span>
          <span>Регистрация участников — mock-режим</span>
        </footer>
      </div>
    </div>
  );
}
