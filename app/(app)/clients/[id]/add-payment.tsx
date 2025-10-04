// app/(app)/clients/[id]/add-payment.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

function isoToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AddPayment({ clientId }: { clientId: string }) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(isoToday());
  const [amount, setAmount] = useState<number | "">("");
  const [medium, setMedium] = useState("bkash");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Lock page scroll while modal is open, restore focus when closing
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Autofocus first field on open
    setTimeout(() => firstFieldRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = prev;
      // restore focus to trigger after close
      triggerRef.current?.focus();
    };
  }, [open]);

  function onBackdropClick(e: React.MouseEvent) {
    if (busy) return;
    // close only if user clicked the backdrop (not inside the card)
    if (e.target === e.currentTarget) setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape" && !busy) setOpen(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          date,
          amount: Number(amount),
          medium,
          note: note.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to add payment");

      // Reset and close
      setOpen(false);
      setAmount("");
      setNote("");
      router.refresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(true)}
        className="rounded-xl border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
      >
        Add payment
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="pay-modal"
            className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={onBackdropClick}
            onKeyDown={onKeyDown}
            role="dialog"
            aria-modal="true"
            aria-label="Add payment"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            <motion.div
              initial={{ y: 14, opacity: 0.98, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1, transition: { type: "spring", stiffness: 360, damping: 28 } }}
              exit={{ y: 10, opacity: 0, scale: 0.98, transition: { duration: 0.18 } }}
              className="w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
                <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  Add payment
                </h3>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-neutral-300 px-2.5 py-1 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  disabled={busy}
                >
                  Close
                </button>
              </div>

              {/* Body */}
              <form onSubmit={submit} className="space-y-3 px-5 py-4">
                <label className="block text-sm">
                  <span className="mb-1 block text-neutral-600 dark:text-neutral-300">Date</span>
                  <input
                    ref={firstFieldRef}
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 bg-white p-2 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:ring-indigo-400"
                    required
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-neutral-600 dark:text-neutral-300">Amount</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-xl border border-neutral-300 bg-white p-2 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:ring-indigo-400"
                    required
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-neutral-600 dark:text-neutral-300">Medium</span>
                  <select
                    value={medium}
                    onChange={(e) => setMedium(e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 bg-white p-2 capitalize outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:ring-indigo-400"
                  >
                    <option value="bkash">bkash</option>
                    <option value="nagad">nagad</option>
                    <option value="rocket">rocket</option>
                    <option value="bank">bank</option>
                    <option value="other">other</option>
                  </select>
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-neutral-600 dark:text-neutral-300">Note (optional)</span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-neutral-300 bg-white p-2 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:ring-indigo-400"
                  />
                </label>

                {err && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {err}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                    disabled={busy}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy || amount === "" || Number(amount) <= 0}
                    className="rounded-xl bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                  >
                    {busy ? "Saving…" : "Save payment"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
