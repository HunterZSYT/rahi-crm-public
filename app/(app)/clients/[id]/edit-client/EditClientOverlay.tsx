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
  status: Status;
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

  const initial = React.useRef({
    name: client.name || "",
    charged_by: client.charged_by as ChargedBy,
    rate: Number(client.rate || 0),
    status: client.status as Status,
    created_at: (client.created_at || "").slice(0, 10),
    contact_name: client.contact_name || "",
    designation: client.designation || "",
    email: client.email || "",
    phone: client.phone || "",
    note: client.note || "",
  });

  const [form, setForm] = React.useState(initial.current);

  const isDirty = React.useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initial.current),
    [form]
  );

  const canSave = isDirty && !saving && form.name.trim().length > 0;

  // Esc to close
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push(backHref);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, backHref]);

  async function onSave() {
    if (!canSave) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/clients/${client.id}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          charged_by: form.charged_by,
          rate: Number(form.rate || 0),
          status: form.status,
          created_at: form.created_at || null,
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

  // small input helpers
  const input = "w-full rounded-xl border border-neutral-300 bg-white p-2 text-sm outline-none focus:ring dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100";
  const label = "mb-1 block text-xs text-neutral-600 dark:text-neutral-400";

  return (
    <div className="fixed inset-0 z-50">
      {/* glassy backdrop */}
      <div
        className="absolute inset-0 bg-neutral-950/50 backdrop-blur-sm"
        onClick={() => router.push(backHref)}
      />
      {/* modal container */}
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-client-title"
        className="absolute inset-0 grid place-items-center p-4"
      >
        <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-neutral-200 bg-white/95 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-neutral-800 dark:bg-neutral-950/85">
          {/* sticky header */}
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white/70 px-5 py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/70">
            <h3 id="edit-client-title" className="text-base font-medium">
              Edit client
            </h3>
            <button
              onClick={() => router.push(backHref)}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
              type="button"
            >
              Close
            </button>
          </header>

          {/* content */}
          <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
            <div className="space-y-4">
              <div>
                <label className={label}>Name <span className="text-rose-500">*</span></label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className={input}
                  placeholder="Client name"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={label}>Client date</label>
                  <input
                    type="date"
                    value={form.created_at}
                    onChange={(e) => setForm((f) => ({ ...f, created_at: e.target.value }))}
                    className={input}
                  />
                </div>
                <div>
                  <label className={label}>Rate</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.rate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, rate: Number(e.target.value || 0) }))
                    }
                    className={input}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={label}>Charged by</label>
                  <select
                    value={form.charged_by}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, charged_by: e.target.value as ChargedBy }))
                    }
                    className={`${input} capitalize`}
                  >
                    <option value="second">second</option>
                    <option value="minute">minute</option>
                    <option value="hour">hour</option>
                    <option value="project">project</option>
                  </select>
                </div>
                <div>
                  <label className={label}>Status</label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value as Status }))
                    }
                    className={`${input} capitalize`}
                  >
                    <option value="active">active</option>
                    <option value="closed">closed</option>
                    <option value="payment_expired">payment expired</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={label}>Contact name</label>
                  <input
                    value={form.contact_name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, contact_name: e.target.value }))
                    }
                    className={input}
                    placeholder="e.g., Jane Doe"
                  />
                </div>
                <div>
                  <label className={label}>Designation</label>
                  <input
                    value={form.designation}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, designation: e.target.value }))
                    }
                    className={input}
                    placeholder="e.g., Marketing Manager"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={label}>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className={input}
                    placeholder="name@company.com"
                  />
                </div>
                <div>
                  <label className={label}>Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className={input}
                    placeholder="+8801..."
                  />
                </div>
              </div>

              <div>
                <label className={label}>Note</label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  className={`${input} min-h-[90px] resize-y`}
                  placeholder="Additional context…"
                />
              </div>
            </div>
          </div>

          {/* sticky footer */}
          <footer className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-neutral-200 bg-white/70 px-5 py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/70">
            <button
              onClick={() => router.push(backHref)}
              className="rounded-xl border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={!canSave}
              className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50 dark:bg-white dark:text-neutral-900"
              type="button"
            >
              {saving && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-transparent dark:border-neutral-900/40 dark:border-t-transparent" />
              )}
              {saving ? "Saving…" : "Save changes"}
            </button>
          </footer>
        </div>
      </section>
    </div>
  );
}
