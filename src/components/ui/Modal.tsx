"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

type ModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  size?: "md" | "lg";
};

export function Modal({
  open,
  title,
  children,
  onClose,
  size = "md",
}: ModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-ink/30"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative z-10 w-full rounded-lg border border-line bg-surface p-6 shadow-sm ${
          size === "lg" ? "max-w-2xl" : "max-w-lg"
        }`}
      >
        <h2
          id="modal-title"
          className="text-base font-semibold tracking-tight text-ink"
        >
          {title}
        </h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
