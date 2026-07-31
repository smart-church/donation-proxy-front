import React from "react";
import { X } from "lucide-react";

export default function Modal({ open, onClose, title, children, footer, size = "md", testid = "modal" }) {
  if (!open) return null;
  const maxW = size === "lg" ? "max-w-2xl" : size === "sm" ? "max-w-sm" : "max-w-lg";
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      data-testid={testid}
    >
      <div className={`w-full ${maxW} surface shadow-soft animate-fade-in`}>
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <h3 className="text-base font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-black/5"
            data-testid={`${testid}-close`}
            style={{ color: "var(--text-dim)" }}
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div
            className="px-5 py-4 border-t flex justify-end gap-2"
            style={{ borderColor: "var(--border)" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
