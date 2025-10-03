"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type ChargedBy = "second" | "minute" | "hour" | "project";
type Status = "active" | "closed" | "payment_expired";

type ClientFull = {
  id: string;
  name: string;
  charged_by: ChargedBy;
  rate: number;
  status: Status;               // ← NEW
  contact_name: string | null;
  designation: string | null;
  email: string | null;
  phone: string | null;
  note: string | null;
  created_at: string; // ISO
};

export default function EditClientOverlay({
  client,
  backHref = "/clients",
}: {
  client: ClientFull;
  backHref?: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);

  // lock background scroll while overlay open
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const [form, setForm] = React.useState({
    name: client.name || "",
    charged_by: client.charged_by as ChargedBy,
    rate: Number(client.rate || 0),
    status: client.status as Status,                // ← NEW
    created_at: (client.created_at || "").slice(0, 10), // YYYY-MM-DD
    contact_name: client.contact_name || "",
    designation: client.designation || "",
    email: client.email || "",
    phone: client.phone || "",
    note: client.note || "",
  });

  async function onSave() {
    try {
      setSaving(true);
      const res = await fetch(`/api/clients/${client.id}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          charged_by: form.charged_by,
          rate: Number(form.rate || 0),
          status: form.status,                                   // ← NEW
          created_at: form.created_at || null,                   // date-only; API will coerce
          contact_name: form.contact_name || null,
          designation: form.designation || null,
          email: form.email || null,
          phone: form.phone || null,
          note: form.note || null,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Update failed");
      router.push(backHref);
      router.refresh();
    } catch (e: any) {
      alert(e?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 md:items-center">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-medium">Edit client</h3>
          <button
            onClick={() => router.push(backHref)}
            className="rounded-xl border px-3 py-1 text-sm"
          >
            Close
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-sm">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-xl border p-2 outline-none focus:ring"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm">Client date</label>
              <input
                type="date"
                value={form.created_at}
                onChange={(e) => setForm((f) => ({ ...f, created_at: e.target.value }))}
                className="w-full rounded-xl border p-2 outline-none focus:ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm">Rate</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.rate}
                onChange={(e) => setForm((f) => ({ ...f, rate: Number(e.target.value || 0) }))}
                className="w-full rounded-xl border p-2 outline-none focus:ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm">Charged by</label>
              <select
                value={form.charged_by}
                onChange={(e) => setForm((f) => ({ ...f, charged_by: e.target.value as ChargedBy }))}
                className="w-full rounded-xl border p-2 outline-none focus:ring capitalize"
              >
                <option value="second">second</option>
                <option value="minute">minute</option>
                <option value="hour">hour</option>
                <option value="project">project</option>
              </select>
            </div>

            {/* NEW: Status select */}
            <div>
              <label className="mb-1 block text-sm">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Status }))}
                className="w-full rounded-xl border p-2 outline-none focus:ring capitalize"
              >
                <option value="active">active</option>
                <option value="closed">closed</option>
                <option value="payment_expired">payment expired</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm">Contact name</label>
              <input
                value={form.contact_name}
                onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
                className="w-full rounded-xl border p-2 outline-none focus:ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm">Designation</label>
              <input
                value={form.designation}
                onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
                className="w-full rounded-xl border p-2 outline-none focus:ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-xl border p-2 outline-none focus:ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-xl border p-2 outline-none focus:ring"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm">Note</label>
            <input
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              className="w-full rounded-xl border p-2 outline-none focus:ring"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => router.push(backHref)}
              className="rounded-xl border px-4 py-2"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50"
              type="button"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
