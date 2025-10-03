// app/(app)/clients/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ChargedBy = "second" | "minute" | "hour" | "project";
const today = () => new Date().toISOString().slice(0, 10);

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);

    const payload = {
      name: String(fd.get("name") || "").trim(),
      charged_by: (fd.get("charged_by") as ChargedBy) || "minute",
      rate: Number(fd.get("rate") || 0),
      contact_name: (fd.get("contact_name") as string) || null,
      designation: (fd.get("designation") as string) || null,
      email: (fd.get("email") as string) || null,
      phone: (fd.get("phone") as string) || null,
      note: (fd.get("note") as string) || null,
      // NEW: pass date-only string; API will convert to ISO timestamp
      created_at: (fd.get("created_at") as string) || undefined,
    };

    if (!payload.name) {
      setErr("Client name is required");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setErr(json.error || "Failed to create client");
      return;
    }

    router.replace("/clients");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Add client</h2>
        <button
          onClick={() => router.back()}
          className="rounded-xl border px-3 py-1.5"
          type="button"
        >
          Back
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border bg-white p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm">Client name*</label>
            <input
              name="name"
              required
              className="w-full rounded-xl border p-2 outline-none focus:ring"
              placeholder="Acme Media"
            />
          </div>

          {/* NEW: client date */}
          <div>
            <label className="mb-1 block text-sm">Client date</label>
            <input
              name="created_at"
              type="date"
              defaultValue={today()}
              className="w-full rounded-xl border p-2 outline-none focus:ring"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm">Rate</label>
            <input
              name="rate"
              type="number"
              step="0.01"
              min="0"
              defaultValue={0}
              className="w-full rounded-xl border p-2 outline-none focus:ring"
              placeholder="400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm">Charged by</label>
            <select
              name="charged_by"
              defaultValue="minute"
              className="w-full rounded-xl border p-2 outline-none focus:ring"
            >
              <option value="second">second</option>
              <option value="minute">minute</option>
              <option value="hour">hour</option>
              <option value="project">project</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm">Contact name</label>
            <input name="contact_name" className="w-full rounded-xl border p-2 outline-none focus:ring" />
          </div>
          <div>
            <label className="mb-1 block text-sm">Designation</label>
            <input name="designation" className="w-full rounded-xl border p-2 outline-none focus:ring" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm">Email</label>
            <input name="email" type="email" className="w-full rounded-xl border p-2 outline-none focus:ring" />
          </div>
          <div>
            <label className="mb-1 block text-sm">Phone</label>
            <input name="phone" className="w-full rounded-xl border p-2 outline-none focus:ring" />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm">Note</label>
          <textarea
            name="note"
            rows={3}
            className="w-full resize-none rounded-xl border p-2 outline-none focus:ring"
          />
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/clients")}
            className="rounded-xl border px-4 py-2"
          >
            Cancel
          </button>
          <button
            disabled={loading}
            className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save client"}
          </button>
        </div>
      </form>
    </main>
  );
}
