// app/(app)/clients/_components/InvoiceDialog.tsx
"use client";

import * as React from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { buildInvoicePdfBlob, type InvoiceRow } from "./invoice-pdf";

/* ------------------------------- Types ------------------------------- */
type Client = {
  id: string;
  name: string;
  contact_name: string | null;
  designation: string | null;
  email: string | null;
  phone: string | null;
  note: string | null;
};

type Work = {
  id: string;
  date: string; // YYYY-MM-DD
  project_name: string | null;
  amount_due: number | null;
  variant_label: string | null;
  note: string | null;
  charged_by_snapshot: "second" | "minute" | "hour" | "project";
  duration_seconds: number | null;
  units: number | null;
  rate_snapshot: number | null;
};

type InvoiceSettings = {
  from_text: string;
  payment_text: string;
  currency: string | null;
  next_number: number | null;
};

/* --------------------------- Defaults (From/Payment) --------------------------- */
const DEFAULT_FROM = [
  "Tahsin Hosen Rahi",
  "Voice Over Artist & Brand Promoter",
  "Alexander, Ramgati, Lakshmipur.",
  "Phone: 01646-664114",
].join("\n");

const DEFAULT_PAYMENT = [
  "Payment Method:",
  "01646664114",
  "(Bkash, Nagad Personal, Cellfin)",
  "",
  "Bank",
  "Name: Tahsin Hosen Rahi",
  "Account No 20502250205496709",
  "Islami Bank",
  "Branch: Maijdee, Noakhali.",
].join("\n");

/* ----------------------------- Utils ----------------------------- */
const BDT = (n: number | null | undefined) =>
  `BDT ${Number(n || 0).toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;

// Duration string + quantity for table
function durationAndQty(w: Work) {
  if (w.charged_by_snapshot === "project") {
    const u = Number(w.units ?? 1);
    return { durationText: `${u} ${u === 1 ? "project" : "projects"}`, qty: u };
  }
  const totalS = Number(w.duration_seconds ?? 0);
  const m = Math.floor(totalS / 60);
  const s = totalS % 60;
  const durationText = totalS > 0 ? `${m}m ${s}s` : "—";

  let qty = 0;
  if (w.charged_by_snapshot === "second") qty = totalS;
  else if (w.charged_by_snapshot === "minute") qty = totalS / 60;
  else if (w.charged_by_snapshot === "hour") qty = totalS / 3600;
  qty = Number.isFinite(qty) ? Number(qty.toFixed(3)) : 0;

  return { durationText, qty };
}

/* ------------------------------ Component --------------------------- */
export default function InvoiceDialog() {
  const [open, setOpen] = React.useState(false);

  // pickable data
  const [clients, setClients] = React.useState<Client[]>([]);
  const [clientId, setClientId] = React.useState<string>("");

  const [works, setWorks] = React.useState<Work[]>([]);
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});

  // invoice meta (server defaults)
  const [invoiceNo, setInvoiceNo] = React.useState<string>("");
  const [invoiceDate, setInvoiceDate] = React.useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [from, setFrom] = React.useState<string>("");
  const [payment, setPayment] = React.useState<string>("");
  const [remember, setRemember] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(false);

  const selectedRows = works.filter((w) => selected[w.id]);
  const total = selectedRows.reduce((s, w) => s + Number(w.amount_due || 0), 0);

  /* --------------------------- Bootstrap on open --------------------------- */
  React.useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const sRes = await fetch("/api/invoice-settings", { cache: "no-store" });
        let s: InvoiceSettings | null = null;
        if (sRes.ok) s = (await sRes.json()) as InvoiceSettings;

        setInvoiceNo(String(s?.next_number ?? 100));
        setFrom(s?.from_text || DEFAULT_FROM);
        setPayment(s?.payment_text || DEFAULT_PAYMENT);

        const cRes = await fetch("/api/invoice/clients", { cache: "no-store" });
        const j = await cRes.json();
        setClients(j?.clients || []);
      } catch {
        setInvoiceNo("100");
        setFrom(DEFAULT_FROM);
        setPayment(DEFAULT_PAYMENT);
      }
    })();
  }, [open]);

  /* ----------------------- Load works when client changes ------------------ */
  React.useEffect(() => {
    if (!clientId) {
      setWorks([]);
      setSelected({}); // clear
      return;
    }
    (async () => {
      // Show all work for that client (no lockout)
      const res = await fetch(
        `/api/invoice/works?clientId=${encodeURIComponent(clientId)}`,
        { cache: "no-store" }
      );
      const j = await res.json();
      const list: Work[] = j?.works || [];
      setWorks(list);
      const def: Record<string, boolean> = {};
      list.forEach((w) => (def[w.id] = true));
      setSelected(def);
    })();
  }, [clientId]);

  function toggleAll(val: boolean) {
    const next: Record<string, boolean> = {};
    for (const w of works) next[w.id] = val;
    setSelected(next);
  }

  /* -------------------- Create invoice, then download PDF ------------------ */
  async function createAndDownloadPDF() {
    if (!clientId || selectedRows.length === 0) {
      alert("Pick a client and at least one work entry.");
      return;
    }

    setLoading(true);
    try {
      // 1) create/update invoice on the server
      const payload = {
        client_id: clientId,
        work_ids: selectedRows.map((w) => w.id),
        issue_date: invoiceDate,
        number: Number(invoiceNo) || null,
        from_text: from,
        payment_text: payment,
        remember_defaults: remember,
      };

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to create/update invoice");
      }

      const { number } = (await res.json()) as { id: string; number: number };
      setInvoiceNo(String(number));

      // 2) Build rows for the PDF (Bangla-safe via @react-pdf/renderer)
      const cl = clients.find((c) => c.id === clientId)!;

      const rows: InvoiceRow[] = selectedRows.map((w) => {
        const itemText = [
          w.project_name || "—",
          w.note ? `— ${w.note}` : "",
          w.date ? `— ${w.date}` : "",
        ]
          .filter(Boolean)
          .join(" ");
        const { durationText, qty } = durationAndQty(w);
        return {
          itemText,
          variant: w.variant_label || "—",
          durationText,
          qty,
          rate: BDT(w.rate_snapshot ?? w.amount_due ?? 0),
          amount: BDT(w.amount_due),
        };
      });

      const billToLines = [
        cl.name,
        cl.designation || undefined,
        cl.contact_name || undefined,
        cl.phone ? `Phone: ${cl.phone}` : undefined,
        cl.email || undefined,
      ].filter(Boolean) as string[];

      // 3) Build & download the PDF
      const blob = await buildInvoicePdfBlob({
        logoUrl: "/logo.jpg", // keep color
        invoiceNo: number,
        invoiceDate,
        fromText: from,
        paymentText: payment,
        billToLines,
        rows,
        balanceDue: BDT(total),
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeClient = cl.name.replace(/[^\w.-]+/g, "_");
      a.download = `invoice-${safeClient}-${invoiceDate}-#${number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.message || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  }

  /* -------------------------------- Render ------------------------------- */
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Create invoice</Button>
      </DialogTrigger>

      <DialogContent className="w-[95vw] sm:max-w-[980px] max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create invoice</DialogTitle>
        </DialogHeader>

        {/* Top controls */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr,1fr] gap-3">
          <div>
            <Label className="text-xs">Client</Label>
            <select
              className="mt-1 w-full rounded-xl border p-2 outline-none"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">Select client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs">Invoice #</Label>
            <Input
              className="mt-1"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
            />
          </div>

          <div>
            <Label className="text-xs">Invoice date</Label>
            <Input
              className="mt-1"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>
        </div>

        {/* From + Payment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">From</Label>
            <Textarea
              rows={6}
              className="mt-1"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <div className="mt-2 flex items-center gap-2">
              <Checkbox
                checked={remember}
                onCheckedChange={(v) => setRemember(Boolean(v))}
                id="remember"
              />
              <Label htmlFor="remember" className="text-xs">
                Remember as default
              </Label>
            </div>
          </div>
          <div>
            <Label className="text-xs">Payment method (footer)</Label>
            <Textarea
              rows={6}
              className="mt-1"
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
            />
          </div>
        </div>

        {/* Work list */}
        <div className="rounded-xl border">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="text-sm font-medium">Delivered work entries</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => toggleAll(true)}>
                Select all
              </Button>
              <Button variant="outline" size="sm" onClick={() => toggleAll(false)}>
                Clear
              </Button>
            </div>
          </div>

          <div className="max-h-[260px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr className="border-b">
                  <th className="w-[40px] px-2 py-2 text-left">#</th>
                  <th className="px-2 py-2 text-left">Date</th>
                  <th className="px-2 py-2 text-left">Project</th>
                  <th className="px-2 py-2 text-left">Variant</th>
                  <th className="px-2 py-2 text-left">Duration/Units</th>
                  <th className="px-2 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {works.length === 0 ? (
                  <tr>
                    <td className="px-2 py-6 text-center text-neutral-500" colSpan={6}>
                      {clientId ? "No work found." : "Choose a client to see entries."}
                    </td>
                  </tr>
                ) : (
                  works.map((w) => {
                    const { durationText } = durationAndQty(w);
                    return (
                      <tr key={w.id} className="border-b">
                        <td className="px-2 py-2">
                          <input
                            type="checkbox"
                            checked={!!selected[w.id]}
                            onChange={(e) =>
                              setSelected((m) => ({ ...m, [w.id]: e.target.checked }))
                            }
                          />
                        </td>
                        <td className="px-2 py-2">{w.date}</td>
                        <td className="px-2 py-2">{w.project_name || "—"}</td>
                        <td className="px-2 py-2">{w.variant_label || "—"}</td>
                        <td className="px-2 py-2">{durationText}</td>
                        <td className="px-2 py-2 text-right">{BDT(w.amount_due)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-6 px-3 py-2">
            <div className="text-sm">
              Selected: <strong>{selectedRows.length}</strong>
            </div>
            <div className="text-sm">
              Total: <strong>{BDT(total)}</strong>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button
            onClick={createAndDownloadPDF}
            disabled={!clientId || selectedRows.length === 0 || loading}
          >
            {loading ? "Creating…" : "Create & Download PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
