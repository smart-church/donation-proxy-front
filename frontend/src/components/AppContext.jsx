import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { applyTheme, getTheme } from "../lib/utils";
import * as api from "../mock/api";

const AppCtx = createContext(null);

export function AppProvider({ children }) {
  const [theme, setTheme] = useState(getTheme());
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [activeEvent, setActiveEvent] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    (async () => {
      try {
        const me = await api.getMe();
        setUser(me);
      } catch {
        setUser(null);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await api.getMe();
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  const notify = useCallback((msg, kind = "info") => {
    setToast({ msg, kind, key: Date.now() });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      user,
      setUser,
      ready,
      refreshUser,
      activeEvent,
      setActiveEvent,
      notify,
    }),
    [theme, user, ready, refreshUser, activeEvent, notify]
  );

  return (
    <AppCtx.Provider value={value}>
      {children}
      {toast && (
        <div
          data-testid="toast"
          className="fixed bottom-6 right-6 z-[100] surface px-4 py-3 shadow-soft animate-fade-in"
          style={{
            borderColor:
              toast.kind === "error"
                ? "var(--danger)"
                : toast.kind === "success"
                ? "var(--brand)"
                : "var(--border)",
          }}
        >
          <div className="text-sm" style={{ color: "var(--text)" }}>{toast.msg}</div>
        </div>
      )}
    </AppCtx.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
