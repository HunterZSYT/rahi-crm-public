"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function isoToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AddPayment({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(isoToday());
  const [amount, setAmount] = useState<number | "">("");
  const [medium, setMedium] = useState("bkash");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
      setOpen(false);
      // Reset
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
        onClick={() => setOpen(true)}
        className="rounded-xl border px-3 py-1.5"
      >
        Add payment
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onMouseDown={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Add payment</h3>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full border px-2 py-1 text-sm"
                disabled={busy}
              >
                Close
              </button>
            </div>

            <form onSubmit={submit} className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block">Date</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border p-2 outline-none focus:ring"
                  required
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block">Amount</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="w-full rounded-xl border p-2 outline-none focus:ring"
                  required
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block">Medium</span>
                <select
                  value={medium}
                  onChange={(e) => setMedium(e.target.value)}
                  className="w-full rounded-xl border p-2 outline-none focus:ring capitalize"
                >
                  <option value="bkash">bkash</option>
                  <option value="nagad">nagad</option>
                  <option value="rocket">rocket</option>
                  <option value="bank">bank</option>
                  <option value="other">other</option>
                </select>
              </label>

              <label className="block text-sm">
                <span className="mb-1 block">Note (optional)</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border p-2 outline-none focus:ring"
                />
              </label>

              {err && <p className="text-sm text-red-600">{err}</p>}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border px-3 py-1.5"
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || amount === "" || Number(amount) <= 0}
                  className="rounded-xl bg-black px-3 py-1.5 text-white disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
