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

  return (
    <>
      {wrappedTrigger ?? (
        <button className="rounded-xl border px-3 py-1.5" onClick={() => setOpen(true)}>
          Edit payment
        </button>
      )}

      {open && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Edit payment</h3>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-xl border px-3 py-1 text-sm"
                >
                  Close
                </button>
              </div>

              <form onSubmit={onSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-sm">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full rounded-xl border p-2 outline-none focus:ring"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm">Amount</label>
                  <input
                    type="number"
                    min={0}
                    value={amount}
                    onChange={(e) =>
                      setAmount(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    required
                    className="w-full rounded-xl border p-2 outline-none focus:ring"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm">Medium</label>
                  <select
                    value={medium}
                    onChange={(e) => setMedium(e.target.value)}
                    className="w-full rounded-xl border p-2 outline-none focus:ring"
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
                  <label className="mb-1 block text-sm">Note (optional)</label>
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full resize-none rounded-xl border p-2 outline-none focus:ring"
                  />
                </div>

                {err && <p className="text-sm text-red-600">{err}</p>}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onDelete}
                    disabled={saving}
                    className="rounded-xl border px-4 py-2 text-red-600 disabled:opacity-50"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={saving}
                    className="rounded-xl border px-4 py-2 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
