"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type TabKey = "clients" | "work" | "payments";
type LiteClient = { id: string; name: string; status?: string };

export default function ExportDialog() {
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<TabKey>("clients");
  const [clients, setClients] = React.useState<LiteClient[]>([]);
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [from, setFrom] = React.useState<string>("");
  const [to, setTo] = React.useState<string>("");

  // load on open
  React.useEffect(() => {
    if (!open) return;
    fetch("/api/clients/lite")
      .then(r => r.json())
      .then(j => setClients(j?.clients ?? []))
      .catch(() => setClients([]));
  }, [open]);

  // reset per-tab
  React.useEffect(() => {
    setQuery("");
    setSelected({});
    setFrom("");
    setTo("");
  }, [tab]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(c => c.name.toLowerCase().includes(q));
  }, [clients, query]);

  function toggleAll(v: boolean) {
    const next: Record<string, boolean> = {};
    if (v) filtered.forEach(c => (next[c.id] = true));
    setSelected(next);
  }

  function buildUrl(): string {
    const p = new URLSearchParams({ table: tab });
    if (tab !== "clients") {
      const ids = Object.entries(selected).filter(([, on]) => on).map(([id]) => id);
      if (ids.length) p.set("client_ids", ids.join(","));
    }
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return `/api/export/csv?${p.toString()}`;
  }

  function downloadCsv() {
    // navigate to API to trigger browser download
    window.location.href = buildUrl();
  }

  const needsClientFilter = tab === "work" || tab === "payments";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Export</Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>Export to CSV</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="mt-2">
          <TabsList>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="work">Work</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          {/* Clients tab */}
          <TabsContent value="clients" className="space-y-4 pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Created from</Label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Created to</Label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={downloadCsv}>Download CSV</Button>
            </div>
          </TabsContent>

          {/* Work & Payments tabs */}
          {(["work", "payments"] as TabKey[]).map((k) => (
            <TabsContent key={k} value={k} className="space-y-4 pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">From (date)</Label>
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">To (date)</Label>
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
              </div>

              {/* Client picker */}
              <div className="rounded-xl border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Input
                    placeholder="Search clients…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="max-w-sm"
                  />
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="selectAll"
                        checked={
                          filtered.length > 0 &&
                          filtered.every((c) => selected[c.id])
                        }
                        onCheckedChange={(v) => toggleAll(Boolean(v))}
                      />
                      <Label htmlFor="selectAll">Select all shown</Label>
                    </div>
                  </div>
                </div>

                <div className="max-h-[260px] overflow-auto">
                  {filtered.length === 0 ? (
                    <div className="p-2 text-sm text-neutral-500">No clients</div>
                  ) : (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                      {filtered.map((c) => (
                        <li key={c.id} className="flex items-center gap-2 py-1">
                          <Checkbox
                            id={`c-${c.id}`}
                            checked={!!selected[c.id]}
                            onCheckedChange={(v) =>
                              setSelected((m) => ({ ...m, [c.id]: Boolean(v) }))
                            }
                          />
                          <Label htmlFor={`c-${c.id}`} className="truncate">
                            {c.name}
                          </Label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={downloadCsv}>Download CSV</Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
