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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  charged_by_snapshot: "second" | "minute" | "hour" | "project" | null;
  duration_seconds: number | null;
  units: number | null;         // snapshot units stored by DB trigger
  rate_snapshot: number | null; // snapshot rate stored by DB trigger
};

type InvoiceSettings = {
  from_text: string;
  payment_text: string;
  currency: string | null;
  next_number: number | null;
};

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

/* ----------------------------- Utilities ---------------------------- */
function moneyBDT(n: number | null | undefined) {
  const v = Number(n || 0);
  return `BDT ${v.toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;
}

function fmtDurationUnits(w: Work): string {
  if (w.charged_by_snapshot === "project") {
    const u = Number(w.units ?? 1);
    return `${u} project${u === 1 ? "" : "s"}`;
  }
  const sec = Math.max(0, Number(w.duration_seconds || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// Try PNG first (often better for color logos), then JPEG.
// Return dataUrl + the jsPDF format to use.
async function loadLogo(): Promise<{ dataUrl: string; fmt: "PNG" | "JPEG" } | null> {
  async function tryFetch(path: string): Promise<string | null> {
    const res = await fetch(path, { cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.readAsDataURL(blob);
    });
  }
  // prefer color PNG if present
  const png = await tryFetch("/logo.png");
  if (png) return { dataUrl: png, fmt: "PNG" };
  const jpg = await tryFetch("/logo.jpg");
  if (jpg) return { dataUrl: jpg, fmt: "JPEG" };
  return null;
}

/* ------------------------------ Component --------------------------- */
export default function InvoiceDialog() {
  const [open, setOpen] = React.useState(false);

  // pickable data
  const [clients, setClients] = React.useState<Client[]>([]);
  const [clientId, setClientId] = React.useState<string>("");

  const [works, setWorks] = React.useState<Work[]>([]);
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});

  // invoice meta (loaded from /api/invoice-settings when dialog opens)
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
      setSelected({});
      return;
    }
    (async () => {
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
      alert("Pick a client and at least one delivered work.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        client_id: clientId,
        work_ids: selectedRows.map((w) => w.id),
        issue_date: invoiceDate,
        number: Number(invoiceNo) || null, // allow auto-number
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
        throw new Error(j?.error || "Failed to create invoice");
      }

      const { id, number } = (await res.json()) as { id: string; number: number };
      setInvoiceNo(String(number));

      const cl = clients.find((c) => c.id === clientId)!;

      const doc = new jsPDF({ unit: "pt", format: "a4" }); // 595 x 842
      const pageW = doc.internal.pageSize.getWidth();

      // Logo in **color** (PNG preferred)
      try {
        const logo = await loadLogo();
        if (logo) {
          doc.addImage(logo.dataUrl, logo.fmt, 40, 30, 110, 40);
        }
      } catch {
        /* ignore if not found */
      }

      // Title & number
      doc.setFontSize(24);
      doc.text("INVOICE", pageW - 40, 50, { align: "right" });
      doc.setFontSize(12);
      doc.text(`# ${number}`, pageW - 40, 70, { align: "right" });

      // Dates
      doc.setFontSize(11);
      const metaY = 110;
      doc.text("Date:", pageW - 200, metaY);
      doc.text(invoiceDate, pageW - 120, metaY);
      doc.text("Delivery Date:", pageW - 200, metaY + 18);
      doc.text(invoiceDate, pageW - 120, metaY + 18);

      // From
      const leftY = 130;
      doc.setFont(undefined, "bold").setFontSize(12);
      doc.text("From:", 40, leftY);
      doc.setFont(undefined, "normal");
      doc.text(from, 40, leftY + 16);

      // Bill To (snapshot)
      const billToY = leftY + 90;
      doc.setFont(undefined, "bold");
      doc.text("Bill To:", 40, billToY);
      doc.setFont(undefined, "normal");
      const billToLines = [
        cl.name,
        cl.designation ? cl.designation : null,
        cl.contact_name ? cl.contact_name : null,
        cl.phone ? `Phone: ${cl.phone}` : null,
        cl.email ? cl.email : null,
      ]
        .filter(Boolean)
        .join("\n");
      doc.text(billToLines, 40, billToY + 16);

      // Balance due box (right)
      const dueBoxY = 145;
      doc.setDrawColor(200);
      doc.roundedRect(pageW - 260, dueBoxY, 220, 36, 6, 6);
      doc.setFont(undefined, "bold");
      doc.text("Balance Due:", pageW - 250, dueBoxY + 23);
      doc.setFont(undefined, "normal");
      doc.text(moneyBDT(total), pageW - 80, dueBoxY + 23, { align: "right" });

      // Items table – now includes Variant + Duration/Units
      const tableRows = selectedRows.map((w) => {
        const descParts = [
          w.project_name || "—",
          w.date ? `— ${w.date}` : "",
          w.note ? `— ${w.note}` : "",
        ].filter(Boolean);

        // quantity/rate based on snapshots; fallback to 1 × total for manual_total
        const qty =
          w.rate_snapshot == null || w.units == null ? 1 : Number(w.units || 1);
        const rate =
          w.rate_snapshot == null ? Number(w.amount_due || 0) : Number(w.rate_snapshot || 0);

        return [
          descParts.join(" "),
          w.variant_label || "—",
          fmtDurationUnits(w),
          String(qty),
          moneyBDT(rate),
          moneyBDT(Number(w.amount_due || 0)),
        ];
      });

      autoTable(doc, {
        startY: billToY + 90,
        head: [["Item", "Variant", "Duration/Units", "Qty", "Rate", "Amount"]],
        body: tableRows,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [45, 45, 45], textColor: 255 },
        columnStyles: {
          3: { halign: "center" }, // Qty
          4: { halign: "right" },  // Rate
          5: { halign: "right" },  // Amount
        },
        margin: { left: 40, right: 40 },
        didDrawPage: (data) => {
          // Footer payment block
          const footY = Math.max(data.cursor.y + 20, 680);
          doc.setFont(undefined, "normal");
          doc.text(payment, 40, footY);
        },
      });

      const safeClient = cl.name.replace(/[^\w.-]+/g, "_");
      doc.save(`invoice-${safeClient}-${invoiceDate}-#${number}.pdf`);

      // refresh list (newly invoiced rows disappear if your API filters them out)
      setWorks((list) => list.filter((w) => !selected[w.id]));
      setSelected({});
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

        {/* From + Payment blocks */}
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
                    <td
                      className="px-2 py-6 text-center text-neutral-500"
                      colSpan={6}
                    >
                      {clientId
                        ? "No delivered work found."
                        : "Choose a client to see entries."}
                    </td>
                  </tr>
                ) : (
                  works.map((w) => (
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
                      <td className="px-2 py-2">{fmtDurationUnits(w)}</td>
                      <td className="px-2 py-2 text-right">
                        {moneyBDT(w.amount_due)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-6 px-3 py-2">
            <div className="text-sm">
              Selected: <strong>{selectedRows.length}</strong>
            </div>
            <div className="text-sm">
              Total: <strong>{moneyBDT(total)}</strong>
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
