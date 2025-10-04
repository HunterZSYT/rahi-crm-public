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
import autoTable, { RowInput } from "jspdf-autotable";

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
  rate_snapshot: number | null; // per-minute when time-based, per-unit when project
};

type Payment = {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  medium: string | null;
  note: string | null;
};

type InvoiceSettings = {
  from_text: string;
  payment_text: string;
  currency: string | null;
  next_number: number | null;
};

/* --------------------------- Defaults --------------------------- */
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

const fmtDateLong = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

function ab2b64(buf: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function registerBanglaFonts(doc: jsPDF) {
  const reg = await fetch("/fonts/HindSiliguri-Regular.ttf").then((r) => r.arrayBuffer());
  doc.addFileToVFS("HindSiliguri-Regular.ttf", ab2b64(reg));
  doc.addFont("HindSiliguri-Regular.ttf", "HindSiliguri", "normal");
  try {
    const bold = await fetch("/fonts/HindSiliguri-Bold.ttf").then((r) => r.arrayBuffer());
    doc.addFileToVFS("HindSiliguri-Bold.ttf", ab2b64(bold));
    doc.addFont("HindSiliguri-Bold.ttf", "HindSiliguri", "bold");
  } catch {}
  doc.setFont("HindSiliguri", "normal");
}

async function loadImageData(url: string) {
  const res = await fetch(url, { cache: "force-cache" });
  const blob = await res.blob();
  return new Promise<{ dataUrl: string; kind: "PNG" | "JPEG" }>((resolve) => {
    const fr = new FileReader();
    fr.onload = () => {
      const dataUrl = fr.result as string;
      const kind = dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
      resolve({ dataUrl, kind });
    };
    fr.readAsDataURL(blob);
  });
}

// Duration helpers
const clamp = (n: number) => (Number.isFinite(n) ? n : 0);
const toMinSec = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return { mm, ss };
};
const minSecLabel = (seconds: number) => {
  const { mm, ss } = toMinSec(seconds);
  return `${mm}m ${ss}s`;
};

/* ---------- layout helpers (fix overlapping by measuring text) ---------- */
const LH = (fontSize: number, factor = 1.2) => fontSize * factor;

/** Draw a label + multi-line text block and return bottom Y */
function drawTextBlock(
  doc: jsPDF,
  opts: {
    label: string;
    text: string;
    x: number;
    y: number;
    maxWidth: number;
    labelSize?: number;
    textSize?: number;
    gap?: number; // gap between label and text
  }
) {
  const { label, text, x, y, maxWidth, labelSize = 11, textSize = 10, gap = 14 } = opts;

  // label
  doc.setFont("HindSiliguri", "bold").setFontSize(labelSize);
  doc.text(label, x, y);

  // split into lines & draw
  doc.setFont("HindSiliguri", "normal").setFontSize(textSize);
  const lines = doc.splitTextToSize(text || "—", maxWidth);
  const firstLineY = y + gap;
  doc.text(lines, x, firstLineY, { lineHeightFactor: 1.2 });

  const height = lines.length * LH(textSize);
  const bottom = firstLineY + height - LH(textSize) + 2; // +2 to balance baseline
  return bottom;
}

/** ensure remaining space or add page and reset to top */
function ensureSpace(doc: jsPDF, needed: number, yCurrent: number, top: number, bottom: number) {
  const maxY = doc.internal.pageSize.getHeight() - bottom;
  if (yCurrent + needed > maxY) {
    doc.addPage();
    return top;
  }
  return yCurrent;
}

/* ------------------------------ Component --------------------------- */
export default function InvoiceDialog() {
  const [open, setOpen] = React.useState(false);

  // pickable data
  const [clients, setClients] = React.useState<Client[]>([]);
  const [clientId, setClientId] = React.useState<string>("");

  const [works, setWorks] = React.useState<Work[]>([]);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});

  // invoice meta (server defaults)
  const [invoiceNo, setInvoiceNo] = React.useState<string>("");
  const [invoiceDate, setInvoiceDate] = React.useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [from, setFrom] = React.useState<string>("");
  const [paymentText, setPaymentText] = React.useState<string>("");
  const [remember, setRemember] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(false);

  const selectedRows = works.filter((w) => selected[w.id]);
  const totalDue = selectedRows.reduce((s, w) => s + Number(w.amount_due || 0), 0);

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
        setPaymentText(s?.payment_text || DEFAULT_PAYMENT);

        const cRes = await fetch("/api/invoice/clients", { cache: "no-store" });
        const j = await cRes.json();
        setClients(j?.clients || []);
      } catch {
        setInvoiceNo("100");
        setFrom(DEFAULT_FROM);
        setPaymentText(DEFAULT_PAYMENT);
      }
    })();
  }, [open]);

  /* ----------------------- Load works & payments when client changes ------------------ */
  React.useEffect(() => {
    if (!clientId) {
      setWorks([]);
      setSelected({});
      setPayments([]);
      return;
    }
    (async () => {
      const res = await fetch(`/api/invoice/works?clientId=${encodeURIComponent(clientId)}`, {
        cache: "no-store",
      });
      const j = await res.json();
      const list: Work[] = j?.works || [];
      setWorks(list);
      const def: Record<string, boolean> = {};
      list.forEach((w) => (def[w.id] = true));
      setSelected(def);
    })();

    (async () => {
      const r = await fetch(`/api/invoice/payments?clientId=${encodeURIComponent(clientId)}`, {
        cache: "no-store",
      });
      const pj = await r.json();
      setPayments(pj?.payments || []);
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
      // 1) server upsert
      const payload = {
        client_id: clientId,
        work_ids: selectedRows.map((w) => w.id),
        issue_date: invoiceDate,
        number: Number(invoiceNo) || null,
        from_text: from,
        payment_text: paymentText,
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

      // 2) Create PDF
      const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" }); // 595 x 842
      await registerBanglaFonts(doc);

      // --- page geometry ---
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const marginX = 28;
      const marginTop = 28;
      const marginBottom = 36;
      const sectionGap = 12;

      // right sidebar for summary
      const sidebarW = 210;
      const gutter = 12;
      const leftMargin = marginX;
      const contentRightMargin = marginX + sidebarW + gutter;
      const leftTableWidth = pageW - leftMargin - contentRightMargin;

      let y = marginTop;

      // Header
      try {
        const { dataUrl, kind } = await loadImageData("/logo.jpg");
        doc.addImage(dataUrl, kind, marginX, y, 108, 40);
      } catch {}

      doc.setFont("HindSiliguri", "bold");
      doc.setFontSize(22);
      doc.text("INVOICE", pageW - marginX, y + 24, { align: "right" });
      doc.setFontSize(11);
      doc.text(`# ${number}`, pageW - marginX, y + 42, { align: "right" });

      // meta box on the right (date / delivery)
      const metaY = y + 50;
      const metaH = 60;
      const metaW = 210;
      doc.setDrawColor(210);
      doc.roundedRect(pageW - marginX - metaW, metaY, metaW, metaH, 8, 8);
      doc.setFont("HindSiliguri", "normal").setFontSize(10);
      doc.text("Date:", pageW - marginX - metaW + 12, metaY + 20);
      doc.text(fmtDateLong(invoiceDate), pageW - marginX - 12, metaY + 20, { align: "right" });
      doc.text("Delivery Date:", pageW - marginX - metaW + 12, metaY + 40);
      doc.text(fmtDateLong(invoiceDate), pageW - marginX - 12, metaY + 40, { align: "right" });

      // ---------- LEFT: From + Bill To (dynamic heights!) ----------
      const textMaxW = Math.min(leftTableWidth, 280);

      // From
      const fromLabelY = metaY - 8; // visually aligns with right meta
      const fromBottom = drawTextBlock(doc, {
        label: "From:",
        text: from,
        x: marginX,
        y: fromLabelY,
        maxWidth: textMaxW,
      });

      // Bill To
      const billStartY = fromBottom + 14;
      const cl = clients.find((c) => c.id === clientId)!;
      const billToLines = [
        cl.name,
        cl.designation ? cl.designation : null,
        cl.contact_name ? cl.contact_name : null,
        cl.phone ? `Phone: ${cl.phone}` : null,
        cl.email ? cl.email : null,
      ]
        .filter(Boolean)
        .join("\n");
      const billBottom = drawTextBlock(doc, {
        label: "Bill To:",
        text: billToLines,
        x: marginX,
        y: billStartY,
        maxWidth: textMaxW,
      });

      // Balance Due chip
      const balanceY = Math.max(metaY + metaH + 10, billStartY - 8);
      const balanceH = 34;
      doc.roundedRect(pageW - marginX - metaW, balanceY, metaW, balanceH, 8, 8);
      doc.setFont("HindSiliguri", "bold").setFontSize(10);
      doc.text("Balance Due:", pageW - marginX - metaW + 12, balanceY + 22);
      doc.setFont("HindSiliguri", "normal");
      doc.text(BDT(totalDue), pageW - marginX - 12, balanceY + 22, { align: "right" });

      // starting Y for columns: below *everything* drawn so far
      const topOfColumns = Math.max(billBottom, balanceY + balanceH, metaY + metaH) + sectionGap;

      // column cursors
      let yLeft = topOfColumns;
      let yRight = topOfColumns;

      // ---------- Shared table theme ----------
      const brandFoot = [16, 153, 127] as [number, number, number];
      const tableTheme = {
        styles: {
          font: "HindSiliguri",
          fontSize: 9,
          cellPadding: 2,
          overflow: "linebreak",
          lineWidth: 0.1,
          valign: "middle" as const,
        },
        headStyles: {
          font: "HindSiliguri",
          fontStyle: "bold" as const,
          fillColor: [45, 45, 45],
          textColor: 255,
          halign: "left" as const,
        },
        bodyStyles: {},
        alternateRowStyles: { fillColor: [248, 248, 248] as any },
        footStyles: {
          font: "HindSiliguri",
          fontStyle: "bold" as const,
          fillColor: brandFoot,
          textColor: 255,
        },
        theme: "grid" as const,
      };

      // ====== COMPUTE GROUPS & TOTALS UP FRONT ======
      const projectRows = selectedRows.filter((w) => w.charged_by_snapshot === "project");
      const projectAmount = projectRows.reduce((s, w) => s + Number(w.amount_due || 0), 0);

      const timeRows = selectedRows.filter((w) => w.charged_by_snapshot !== "project");
      const timeAmount = timeRows.reduce((s, w) => s + Number(w.amount_due || 0), 0);
      const timeSeconds = timeRows.reduce((s, w) => s + clamp(w.duration_seconds || 0), 0);

      // ====== PIN RIGHT SIDEBAR ON PAGE 1 (draw before left column) ======
      const drawRightTable = (
        title: string,
        headCols: number,
        rows: RowInput[],
        colWidths: number[]
      ) => {
        yRight = ensureSpace(doc, 60 + rows.length * 16, yRight, marginTop, marginBottom);
        const head: RowInput[] = [[{ content: title, colSpan: headCols } as any]];
        const colStyles: Record<number, any> = {};
        colWidths.forEach((w, i) => (colStyles[i] = { cellWidth: w }));
        autoTable(doc, {
          ...tableTheme,
          margin: { left: pageW - marginX - sidebarW, right: marginX },
          startY: yRight,
          tableWidth: sidebarW,
          head,
          body: rows,
          columnStyles: colStyles,
        });
        // @ts-ignore
        yRight = doc.lastAutoTable.finalY + 8;
      };

      // Draw right column now (on page 1)
      drawRightTable(
        "Total",
        3,
        [
          ["Project Based", String(projectRows.length), BDT(projectAmount)],
          ["Total Min", minSecLabel(timeSeconds), BDT(timeAmount)],
        ],
        [96, 52, sidebarW - (96 + 52) - 2]
      );
      drawRightTable("Total Due", 2, [["Amount", BDT(totalDue)]], [96, sidebarW - 96 - 2]);
      const payRows: RowInput[] =
        payments.length > 0
          ? payments
              .slice()
              .sort((a, b) => (a.date < b.date ? -1 : 1))
              .map((p) => [fmtDateLong(p.date), `${BDT(p.amount)}  ${String(p.medium || "").toLowerCase()}`])
          : [["—", ""]];
      drawRightTable("Payment History", 2, payRows, [96, sidebarW - 96 - 2]);

      // Make sure we resume drawing the left column on page 1.
      doc.setPage(1);

      /* ---------------- Project Based (left column) ---------------- */
      if (projectRows.length) {
        doc.setFont("HindSiliguri", "bold").setFontSize(11);
        yLeft = ensureSpace(doc, 18, yLeft, marginTop, marginBottom);
        doc.text("Project Based", leftMargin, yLeft);

        const body: RowInput[] = projectRows.map((w) => [
          fmtDateLong(w.date),
          w.project_name || "—",
          BDT(w.rate_snapshot ?? w.amount_due ?? 0),
          BDT(w.amount_due ?? 0),
        ]);

        const pDateW = 120;
        const pRateW = 60;
        const pAmtW = 60;
        const pNameW = Math.max(60, leftTableWidth - (pDateW + pRateW + pAmtW));

        autoTable(doc, {
          ...tableTheme,
          startY: yLeft + 6,
          margin: { left: leftMargin, right: contentRightMargin },
          tableWidth: leftTableWidth,
          head: [["Date", "Project", "Rate", "Amount"]],
          body,
          foot: [[{ content: "Subtotal", colSpan: 3, styles: { halign: "right" } }, BDT(projectAmount)]],
          columnStyles: {
            0: { cellWidth: pDateW },
            1: { cellWidth: pNameW },
            2: { cellWidth: pRateW, halign: "right" },
            3: { cellWidth: pAmtW, halign: "right" },
          },
          willDrawCell: (data) => {
            if (data.row.index === 0 && data.row.section === "body") {
              yLeft = ensureSpace(doc, 80, yLeft, marginTop, marginBottom);
            }
          },
        });
        // @ts-ignore
        yLeft = doc.lastAutoTable.finalY + sectionGap;
      }

      /* ------------- Per-Min grouped tables (left column) ------------- */
      if (timeRows.length) {
        const byRate = new Map<number, Work[]>();
        for (const w of timeRows) {
          const r = Number(w.rate_snapshot || 0);
          if (!byRate.has(r)) byRate.set(r, []);
          byRate.get(r)!.push(w);
        }
        const groups = Array.from(byRate.entries()).sort((a, b) => a[0] - b[0]);

        for (const [rate, list] of groups) {
          // group title
          doc.setFont("HindSiliguri", "bold").setFontSize(11);
          yLeft = ensureSpace(doc, 16, yLeft, marginTop, marginBottom);
          doc.text(`Per Min Rate ${rate}`, leftMargin, yLeft);

          const totalSeconds = list.reduce((s, w) => s + clamp(w.duration_seconds || 0), 0);

          const tDateW = 110;
          const tMinW = 32;
          const tSecW = 32;
          const tAmtW = 65;
          const tNameW = Math.max(60, leftTableWidth - (tDateW + tMinW + tSecW + tAmtW));

          const body: RowInput[] = list.map((w) => {
            const secs = clamp(w.duration_seconds || 0);
            const { mm, ss } = toMinSec(secs);
            return [fmtDateLong(w.date), w.project_name || "—", String(mm), String(ss), BDT(w.amount_due ?? 0)];
          });
          const subtotal = list.reduce((s, w) => s + Number(w.amount_due || 0), 0);

          autoTable(doc, {
            ...tableTheme,
            startY: yLeft + 6,
            margin: { left: leftMargin, right: contentRightMargin },
            tableWidth: leftTableWidth,
            head: [["Date", "Name", "Min", "Sec", "Amount"]],
            body,
            foot: [
              [{ content: `Total Min: ${minSecLabel(totalSeconds)}`, colSpan: 4, styles: { halign: "right" } }, ""],
              [{ content: "Subtotal", colSpan: 4, styles: { halign: "right" } }, BDT(subtotal)],
            ],
            columnStyles: {
              0: { cellWidth: tDateW },
              1: { cellWidth: tNameW },
              2: { cellWidth: tMinW, halign: "right" },
              3: { cellWidth: tSecW, halign: "right" },
              4: { cellWidth: tAmtW, halign: "right" },
            },
          });
          // @ts-ignore
          yLeft = doc.lastAutoTable.finalY + sectionGap;
        }
      }

      // Advance below the taller column (footer start on the last page used)
      y = Math.max(yLeft, yRight) + sectionGap;
      // If the right column caused a new page earlier, jump to the last page now
      doc.setPage(doc.getNumberOfPages());

      // Footer: payment instructions (auto page-break safe)
      y = ensureSpace(doc, 70, y, marginTop, marginBottom);
      doc.setFont("HindSiliguri", "bold").setFontSize(10);
      doc.text("Payment Method:", marginX, y);
      doc.setFont("HindSiliguri", "normal").setFontSize(9);
      let yy = y + 14;
      paymentText.split("\n").forEach((ln) => {
        yy = ensureSpace(doc, 14, yy, marginTop, marginBottom);
        doc.text(ln, marginX, yy);
        yy += 12;
      });

      // filename
      const safeClient = (cl?.name ?? "Client").replace(/[^\w.-]+/g, "_");
      doc.save(`invoice-${safeClient}-${invoiceDate}-#${number}.pdf`);
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
            <Input className="mt-1" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
          </div>

          <div>
            <Label className="text-xs">Invoice date</Label>
            <Input className="mt-1" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </div>
        </div>

        {/* From + Payment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">From</Label>
            <Textarea rows={6} className="mt-1" value={from} onChange={(e) => setFrom(e.target.value)} />
            <div className="mt-2 flex items-center gap-2">
              <Checkbox checked={remember} onCheckedChange={(v) => setRemember(Boolean(v))} id="remember" />
              <Label htmlFor="remember" className="text-xs">Remember as default</Label>
            </div>
          </div>
          <div>
            <Label className="text-xs">Payment method (footer)</Label>
            <Textarea rows={6} className="mt-1" value={paymentText} onChange={(e) => setPaymentText(e.target.value)} />
          </div>
        </div>

        {/* Work list */}
        <div className="rounded-xl border">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="text-sm font-medium">Work entries</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => toggleAll(true)}>Select all</Button>
              <Button variant="outline" size="sm" onClick={() => toggleAll(false)}>Clear</Button>
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
                    const secs = clamp(w.duration_seconds || 0);
                    const { mm, ss } = toMinSec(secs);
                    const dur =
                      w.charged_by_snapshot === "project"
                        ? `${Number(w.units ?? 1)} project${Number(w.units ?? 1) > 1 ? "s" : ""}`
                        : `${mm}m ${ss}s`;
                    return (
                      <tr key={w.id} className="border-b">
                        <td className="px-2 py-2">
                          <input
                            type="checkbox"
                            checked={!!selected[w.id]}
                            onChange={(e) => setSelected((m) => ({ ...m, [w.id]: e.target.checked }))}
                          />
                        </td>
                        <td className="px-2 py-2">{fmtDateLong(w.date)}</td>
                        <td className="px-2 py-2">{w.project_name || "—"}</td>
                        <td className="px-2 py-2">
                          {w.variant_label || (w.charged_by_snapshot === "project" ? "Project Based" : "Per Min")}
                        </td>
                        <td className="px-2 py-2">{dur}</td>
                        <td className="px-2 py-2 text-right">{BDT(w.amount_due)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-6 px-3 py-2">
            <div className="text-sm">Selected: <strong>{selectedRows.length}</strong></div>
            <div className="text-sm">Total: <strong>{BDT(totalDue)}</strong></div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          <Button onClick={createAndDownloadPDF} disabled={!clientId || selectedRows.length === 0 || loading}>
            {loading ? "Creating…" : "Create & Download PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
