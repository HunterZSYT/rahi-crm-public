// app/(app)/clients/[id]/EditClientDialog.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ClientLite = {
  id: string;
  name: string;
  contact_name: string | null;
  designation: string | null;
  email: string | null;
  phone: string | null;
  note: string | null;
  created_at?: string | null; // ISO timestamp
};

const toDateInput = (iso?: string | null) =>
  iso ? new Date(iso).toISOString().slice(0, 10) : "";

export default function EditClientDialog({ client }: { client: ClientLite }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    name: client.name || "",
    contact_name: client.contact_name || "",
    designation: client.designation || "",
    email: client.email || "",
    phone: client.phone || "",
    note: client.note || "",
    created_at: toDateInput(client.created_at) || "",
  });

  // smaller type scale + dark-friendly field classes
  const field =
    "w-full rounded-xl border border-neutral-300 bg-white p-2 text-[13px] outline-none placeholder-neutral-400 focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:ring-indigo-400";

  function set<K extends keyof typeof form>(key: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: v }));
  }

  function validate() {
    if (!form.name.trim()) return "Name is required.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      return "Please enter a valid email.";
    if (form.created_at && !/^\d{4}-\d{2}-\d{2}$/.test(form.created_at))
      return "Client date must be YYYY-MM-DD.";
    return null;
  }

  async function onSave() {
    const v = validate();
    if (v) {
      setErr(v);
      return;
    }
    setErr(null);
    setSaving(true);
    try {
      // normalize: send empty strings as null where appropriate
      const payload = {
        name: form.name.trim(),
        contact_name: form.contact_name.trim() || null,
        designation: form.designation.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        note: form.note.trim() || null,
        created_at: form.created_at || null, // server can coerce to date
      };

      const res = await fetch(`/api/clients/${client.id}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Update failed");
      }

      setOpen(false);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && setOpen(o)}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-[13px]">
          Edit
        </Button>
      </DialogTrigger>

      <DialogContent
        className="sm:max-w-[560px] border border-neutral-200 bg-white text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
      >
        <DialogHeader>
          <DialogTitle className="text-sm font-medium">Edit client</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label className="mb-1 block text-[11px] text-neutral-600 dark:text-neutral-400">
              Name<span className="text-rose-500">*</span>
            </Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={field}
              autoComplete="organization"
              placeholder="Acme Media"
            />
          </div>

          {/* Client date */}
          <div>
            <Label className="mb-1 block text-[11px] text-neutral-600 dark:text-neutral-400">
              Client date
            </Label>
            <Input
              type="date"
              value={form.created_at}
              onChange={(e) => set("created_at", e.target.value)}
              className={field}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1 block text-[11px] text-neutral-600 dark:text-neutral-400">
                Contact name
              </Label>
              <Input
                value={form.contact_name}
                onChange={(e) => set("contact_name", e.target.value)}
                className={field}
                autoComplete="name"
              />
            </div>
            <div>
              <Label className="mb-1 block text-[11px] text-neutral-600 dark:text-neutral-400">
                Designation
              </Label>
              <Input
                value={form.designation}
                onChange={(e) => set("designation", e.target.value)}
                className={field}
                placeholder="e.g., Project Manager"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1 block text-[11px] text-neutral-600 dark:text-neutral-400">
                Email
              </Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={field}
                autoComplete="email"
                placeholder="name@company.com"
              />
            </div>
            <div>
              <Label className="mb-1 block text-[11px] text-neutral-600 dark:text-neutral-400">
                Phone
              </Label>
              <Input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className={field}
                autoComplete="tel"
                placeholder="+8801XXXXXXXXX"
              />
            </div>
          </div>

          <div>
            <Label className="mb-1 block text-[11px] text-neutral-600 dark:text-neutral-400">
              Note
            </Label>
            {/* Use a textarea for longer notes; shadcn Input is fine too, but this feels nicer */}
            <textarea
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              rows={3}
              className={
                field + " resize-y min-h-[88px]"
              }
              placeholder="Internal notes about this client…"
            />
          </div>

          {err && (
            <p className="text-[12px] text-rose-600 dark:text-rose-400">{err}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="text-[13px]"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={onSave}
              disabled={saving}
              className="text-[13px]"
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
