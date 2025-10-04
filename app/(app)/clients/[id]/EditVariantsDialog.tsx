// app/(app)/clients/[id]/EditVariantsDialog.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Pencil, Trash2, SlidersHorizontal } from "lucide-react";

type VariantRow = { label: string; count: number };

export default function EditVariantsDialog({
  clientId,
  /** if true (default), router.refresh() when dialog closes */
  refreshOnClose = true,
  /** optional callback fired when dialog transitions from open -> closed */
  onAfterClose,
}: {
  clientId: string;
  refreshOnClose?: boolean;
  onAfterClose?: () => void;
}) {
  const router = useRouter();

  const [open, setOpen] = React.useState(false);
  const [rows, setRows] = React.useState<VariantRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState<string | null>(null); // label being saved
  const [query, setQuery] = React.useState("");

  const fetchRows = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/clients/${clientId}/variants`, { cache: "no-store" });
      const j = (await r.json()) as { variants: VariantRow[] };
      setRows(j.variants || []);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  React.useEffect(() => {
    if (open) fetchRows();
  }, [open, fetchRows]);

  // Fire callbacks when the dialog actually closes
  const prevOpen = React.useRef(open);
  React.useEffect(() => {
    if (prevOpen.current && !open) {
      if (refreshOnClose) router.refresh();
      onAfterClose?.();
    }
    prevOpen.current = open;
  }, [open, refreshOnClose, onAfterClose, router]);

  async function rename(oldLabel: string, newLabelRaw: string) {
    const newLabel = newLabelRaw.trim();
    if (!newLabel || newLabel === oldLabel) return;
    setSaving(oldLabel);
    try {
      const r = await fetch(`/api/clients/${clientId}/variants`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldLabel, newLabel }),
      });
      if (!r.ok) throw new Error("Rename failed");
      await fetchRows();
    } catch {
      alert("Could not rename. Please try again.");
    } finally {
      setSaving(null);
    }
  }

  async function remove(label: string) {
    if (!confirm(`Delete variant “${label}”? This will clear the variant on ${rows.find(r => r.label === label)?.count ?? 0} rows.`)) {
      return;
    }
    setSaving(label);
    try {
      const r = await fetch(`/api/clients/${clientId}/variants`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      if (!r.ok) throw new Error("Delete failed");
      await fetchRows();
    } catch {
      alert("Could not delete. Please try again.");
    } finally {
      setSaving(null);
    }
  }

  const filtered = rows.filter(r => r.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Edit variants
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[95vw] sm:max-w-[640px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit variants</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Input
            placeholder="Search variants…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
          />
          <Button variant="ghost" onClick={fetchRows} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>

        <div className="mt-3 rounded-xl border">
          <div className="grid grid-cols-[1fr,110px,120px] items-center gap-2 border-b px-3 py-2 text-sm font-medium">
            <div>Name</div>
            <div className="text-right">In use</div>
            <div className="text-right">Actions</div>
          </div>

          {loading ? (
            <div className="px-3 py-8 text-center text-sm text-neutral-500">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-neutral-500">No variants.</div>
          ) : (
            filtered.map((v) => (
              <Row
                key={v.label}
                v={v}
                saving={saving === v.label}
                onRename={rename}
                onDelete={remove}
              />
            ))
          )}
        </div>

        <p className="mt-2 text-xs text-neutral-500">
          Renaming will update all <em>work entries</em> for this client. If you rename to an existing name, they’ll be merged.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  v, saving, onRename, onDelete,
}: {
  v: { label: string; count: number };
  saving: boolean;
  onRename: (oldLabel: string, newLabel: string) => void;
  onDelete: (label: string) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [val, setVal] = React.useState(v.label);
  React.useEffect(() => setVal(v.label), [v.label]);

  return (
    <div className="grid grid-cols-[1fr,110px,120px] items-center gap-2 border-b px-3 py-2 last:border-b-0">
      <div>
        {editing ? (
          <Input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onRename(v.label, val);
              if (e.key === "Escape") setEditing(false);
            }}
            className="h-8"
            autoFocus
          />
        ) : (
          <span className="text-sm">{v.label}</span>
        )}
      </div>

      <div className="text-right text-sm tabular-nums">{v.count.toLocaleString()}</div>

      <div className="flex items-center justify-end gap-2">
        {editing ? (
          <>
            <Button size="sm" className="h-8 px-2" onClick={() => onRename(v.label, val)} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="secondary" className="h-8 px-2 gap-1" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" /> Rename
            </Button>
            <Button size="sm" variant="destructive" className="h-8 px-2 gap-1" onClick={() => onDelete(v.label)} disabled={saving}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
