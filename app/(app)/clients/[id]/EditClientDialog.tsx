"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  created_at?: string | null; // NEW
};

const toDateInput = (iso?: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");

export default function EditClientDialog({ client }: { client: ClientLite }) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    name: client.name || "",
    contact_name: client.contact_name || "",
    designation: client.designation || "",
    email: client.email || "",
    phone: client.phone || "",
    note: client.note || "",
    created_at: toDateInput(client.created_at) || "", // NEW (date input format)
  });

  async function onSave() {
    try {
      setSaving(true);
      const res = await fetch(`/api/clients/${client.id}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Update failed");
      }
      setOpen(false);
      location.reload();
    } catch (e: any) {
      alert(e?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Edit</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Edit client</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label className="text-xs">Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>

          {/* NEW: client date */}
          <div>
            <Label className="text-xs">Client date</Label>
            <Input
              type="date"
              value={form.created_at}
              onChange={(e) => setForm((f) => ({ ...f, created_at: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Contact name</Label>
              <Input value={form.contact_name} onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Designation</Label>
              <Input value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>

          <div>
            <Label className="text-xs">Note</Label>
            <Input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
