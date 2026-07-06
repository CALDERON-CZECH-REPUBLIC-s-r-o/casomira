"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { Btn } from "./ui";

/* ---------- Modal ---------- */

/** Překryvný modal. Zavře se Escapem i klikem na pozadí. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,31,26,.45)] p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`w-full ${size === "lg" ? "max-w-2xl" : "max-w-md"} rounded-[22px] border border-ink-200 bg-white shadow-[var(--shadow-xl)]`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="border-b border-ink-150 px-5 py-4 text-lg font-bold text-ink-900">
            {title}
          </div>
        )}
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-ink-150 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Potvrzení mazání (opis kontrolního slova) ---------- */

/** Destruktivní potvrzení: vyjmenuje dopady, vyžaduje opsat kontrolní slovo,
 * pak submitne server akci `action` (bound). */
export function ConfirmDialog({
  triggerLabel,
  triggerClassName,
  title,
  message,
  dopady,
  slovo = "SMAZAT",
  confirmLabel = "Smazat",
  action,
}: {
  triggerLabel: ReactNode;
  triggerClassName?: string;
  title: string;
  message: ReactNode;
  dopady?: string[];
  slovo?: string;
  confirmLabel?: string;
  action: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState("");
  const sedi = v.trim().toUpperCase() === slovo.toUpperCase();
  const id = useId();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setV("");
          setOpen(true);
        }}
        className={
          triggerClassName ??
          "text-sm font-medium text-error transition-colors hover:underline"
        }
      >
        {triggerLabel}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title}>
        <p className="text-sm text-ink-600">{message}</p>
        {dopady && dopady.length > 0 && (
          <ul className="mt-3 space-y-1 rounded-[10px] bg-error-bg p-3 text-[13px] text-error">
            {dopady.map((d) => (
              <li key={d}>• {d}</li>
            ))}
          </ul>
        )}
        <label htmlFor={id} className="cal-label mt-4">
          Pro potvrzení opiš <strong className="text-ink-900">{slovo}</strong>
          <input
            id={id}
            value={v}
            onChange={(e) => setV(e.target.value)}
            autoComplete="off"
            className="cal-input"
          />
        </label>
        <div className="mt-5 flex items-center justify-end gap-2">
          <Btn variant="ghost" onClick={() => setOpen(false)}>
            Zrušit
          </Btn>
          <form action={action}>
            <Btn
              variant="danger"
              type="submit"
              disabled={!sedi}
              className="!bg-error !px-4 !py-2 !text-white hover:!bg-[#c2453c]"
            >
              {confirmLabel}
            </Btn>
          </form>
        </div>
      </Dialog>
    </>
  );
}

/* ---------- Segmentovaný přepínač ---------- */

/** Segmentovaný přepínač; drží hodnotu ve skrytém inputu `name` pro server akce. */
export function SegmentedToggle({
  name,
  options,
  defaultValue,
  onChange,
}: {
  name?: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  onChange?: (v: string) => void;
}) {
  const [val, setVal] = useState(defaultValue ?? options[0]?.value ?? "");
  return (
    <div className="inline-flex rounded-[10px] bg-ink-100 p-1">
      {name && <input type="hidden" name={name} value={val} />}
      {options.map((o) => {
        const je = o.value === val;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => {
              setVal(o.value);
              onChange?.(o.value);
            }}
            className={`rounded-[7px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
              je
                ? "bg-teal-500 text-white shadow-[var(--shadow-xs)]"
                : "text-ink-600 hover:text-ink-900"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
