"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

type ChargedBy = "second" | "minute" | "hour" | "project";
const today = () => new Date().toISOString().slice(0, 10);

// small helper so inputs share the same styling (light + dark)
const baseField =
  "w-full rounded-xl border p-2.5 text-[13.5px] outline-none " +
  "bg-white/90 text-neutral-900 placeholder:text-neutral-400 border-neutral-300 " +
  "focus:ring focus:ring-indigo-200 " +
  "dark:bg-neutral-800/80 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:border-neutral-700 dark:focus:ring-neutral-700";

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
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Top bar */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Add client
        </h2>

        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      {/* Card */}
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border bg-white/70 p-6 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/60"
      >
        {/* Primary info */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-[12.5px] text-neutral-600 dark:text-neutral-400">
              Client name*
            </label>
            <input
              name="name"
              required
              placeholder="Acme Media"
              className={baseField}
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1 block text-[12.5px] text-neutral-600 dark:text-neutral-400">
              Client date
            </label>
            <input
              type="date"
              name="created_at"
              defaultValue={today()}
              className={baseField}
            />
          </div>

          <div>
            <label className="mb-1 block text-[12.5px] text-neutral-600 dark:text-neutral-400">
              Rate
            </label>
            <input
              name="rate"
              type="number"
              step="0.01"
              min="0"
              defaultValue={0}
              placeholder="400"
              className={baseField}
            />
          </div>

          <div>
            <label className="mb-1 block text-[12.5px] text-neutral-600 dark:text-neutral-400">
              Charged by
            </label>
            <select
              name="charged_by"
              defaultValue="minute"
              className={baseField}
            >
              <option value="second">second</option>
              <option value="minute">minute</option>
              <option value="hour">hour</option>
              <option value="project">project</option>
            </select>
            <p className="mt-1 text-[11.5px] text-neutral-500 dark:text-neutral-400">
              This is the default basis used for new work entries.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-[12.5px] text-neutral-600 dark:text-neutral-400">
              Contact name
            </label>
            <input name="contact_name" className={baseField} />
          </div>
          <div>
            <label className="mb-1 block text-[12.5px] text-neutral-600 dark:text-neutral-400">
              Designation
            </label>
            <input name="designation" className={baseField} />
          </div>

          <div>
            <label className="mb-1 block text-[12.5px] text-neutral-600 dark:text-neutral-400">
              Email
            </label>
            <input type="email" name="email" className={baseField} />
          </div>
          <div>
            <label className="mb-1 block text-[12.5px] text-neutral-600 dark:text-neutral-400">
              Phone
            </label>
            <input name="phone" className={baseField} />
          </div>
        </section>

        {/* Note */}
        <section className="mt-5">
          <label className="mb-1 block text-[12.5px] text-neutral-600 dark:text-neutral-400">
            Note
          </label>
          <textarea
            name="note"
            rows={3}
            className={baseField + " resize-none"}
            placeholder="Any internal notes…"
          />
        </section>

        {/* Error */}
        {err && (
          <p className="mt-3 text-sm font-medium text-rose-600 dark:text-rose-400">
            {err}
          </p>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push("/clients")}
            className="rounded-xl border px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>

          <button
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white shadow-sm transition-[transform,opacity] hover:bg-neutral-900 active:scale-[.98] disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Saving…" : "Save client"}
          </button>
        </div>
      </form>
    </main>
  );
}
