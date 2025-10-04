// app/(app)/clients/[id]/edit-payment.tsx
"use client";

import React, {
  cloneElement,
  isValidElement,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

/* ---------------- Types ---------------- */

type PaymentMedium =
  | "bkash"
  | "bank"
  | "cash"
  | "nagad"
  | "rocket"
  | "other"
  | string;

export type PaymentInitial = {
  id: string;
  date: string; // ISO date or yyyy-mm-dd
  amount: number | string;
  medium: PaymentMedium;
  note: string | null;
};

type TriggerElProps = { onClick?: (e: React.MouseEvent) => void };
type Props = {
  initial: PaymentInitial;
  /** Optional trigger (e.g. a <tr> from the table) that opens this modal on click */
  trigger?: React.ReactElement<TriggerElProps>;
};

/* ---------------- Portal (avoid <div> inside <tbody>) ---------------- */

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

/* ---------------- Component ---------------- */

export default function EditPayment({ initial, trigger }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // local state for form fields
  const [date, setDate] = useState<string>("");
  const [amount, setAmount] = useState<number | "">("");
  const [medium, setMedium] = useState<PaymentMedium>("bkash");
  const [note, setNote] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const firstFieldRef = React.useRef<HTMLInputElement | null>(null);
  const lastActiveEl = React.useRef<HTMLElement | null>(null);

  // hydrate on open
  useEffect(() => {
    if (!open) return;
    setDate((initial.date ?? "").slice(0, 10));
    setAmount(
      initial.amount === "" || initial.amount == null
        ? ""
        : Number(initial.amount)
    );
    setMedium(initial.medium ?? "bkash");
    setNote(initial.note ?? "");
    setErr(null);
  }, [open, initial]);

  // body scroll lock + autofocus + focus restore
  useEffect(() => {
    if (open) {
      lastActiveEl.current = document.activeElement as HTMLElement | null;
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      setTimeout(() => firstFieldRef.current?.focus(), 0);
      return () => {
        document.body.style.overflow = prev;
        lastActiveEl.current?.focus?.();
      };
    }
  }, [open]);

  const wrappedTrigger = useMemo(() => {
    if (!trigger || !isValidElement<TriggerElProps>(trigger)) return trigger;
    return cloneElement(trigger, {
      onClick: (e: React.MouseEvent) => {
        trigger.props.onClick?.(e);
        setOpen(true);
      },
    });
  }, [trigger]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/payments/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          amount: amount === "" ? null : Number(amount),
          medium,
          note: note || null,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed to save payment");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save payment");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!confirm("Delete this payment? This cannot be undone.")) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/payments/${initial.id}`, {
        method: "DELETE",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed to delete payment");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to delete payment");
    } finally {
      setSaving(false);
    }
  }

  function onBackdropClick(e: React.MouseEvent) {
    if (saving) return;
    if (e.target === e.currentTarget) setOpen(false);
  }
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape" && !saving) setOpen(false);
  }

  const input =
    "w-full rounded-xl border border-neutral-300 bg-white p-2 text-sm outline-none placeholder-neutral-400 focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:ring-indigo-400";
  const select =
    "w-full rounded-xl border border-neutral-300 bg-white p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:ring-indigo-400";
  const btn =
    "rounded-xl border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800";

  return (
    <>
      {wrappedTrigger ?? (
        <button className="rounded-xl border px-3 py-1.5" onClick={() => setOpen(true)}>
          Edit payment
        </button>
      )}

      <AnimatePresence>
        {open && (
          <Portal>
            <motion.div
              key="edit-payment"
              className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
              onClick={onBackdropClick}
              onKeyDown={onKeyDown}
              role="dialog"
              aria-modal="true"
              aria-label="Edit payment"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
            >
              <motion.div
                initial={{ y: 14, opacity: 0.98, scale: 0.98 }}
                animate={{
                  y: 0,
                  opacity: 1,
                  scale: 1,
                  transition: { type: "spring", stiffness: 360, damping: 28 },
                }}
                exit={{ y: 10, opacity: 0, scale: 0.98, transition: { duration: 0.18 } }}
                className="w-full max-w-xl overflow-hidden rounded-2xl border border-neutral-200 bg-white text-neutral-900 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
                  <h3 className="text-base font-semibold">Edit payment</h3>
                  <button onClick={() => setOpen(false)} className={btn} disabled={saving}>
                    Close
                  </button>
                </div>

                {/* Body */}
                <form onSubmit={onSubmit} className="space-y-4 px-5 py-4">
                  <div>
                    <label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Date</label>
                    <input
                      ref={firstFieldRef}
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className={input}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Amount</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={amount}
                      onChange={(e) =>
                        setAmount(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      required
                      className={input}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Medium</label>
                    <select
                      value={medium}
                      onChange={(e) => setMedium(e.target.value)}
                      className={select}
                    >
                      <option value="bkash">Bkash</option>
                      <option value="bank">Bank</option>
                      <option value="cash">Cash</option>
                      <option value="nagad">Nagad</option>
                      <option value="rocket">Rocket</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">
                      Note (optional)
                    </label>
                    <textarea
                      rows={3}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className={input + " resize-none"}
                    />
                  </div>

                  {err && <p className="text-sm text-rose-600 dark:text-rose-400">{err}</p>}

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={onDelete}
                      disabled={saving}
                      className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-700/60 dark:text-rose-300 dark:hover:bg-rose-900/30"
                    >
                      Delete
                    </button>
                    <button type="button" onClick={() => setOpen(false)} disabled={saving} className={btn}>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                    >
                      {saving ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>
    </>
  );
}
