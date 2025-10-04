// app/(app)/clients/_components/invoice-pdf.tsx
import {
  Document,
  Page,
  Text,
  View,
  Font,
  Image,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";

/** ---------- Types the dialog will pass ---------- */
export type InvoiceRow = {
  // display
  itemText: string;                 // project name + extra
  variant: string;                  // "Voice-Over", etc (unused in the grouped tables now)
  amount: string;                   // formatted BDT string
  rate: string;                     // formatted BDT string (only used in some headers)
  qty: number;                      // minutes for per-min; units for project
  // grouping + math
  chargedBy: "project" | "minute" | "second" | "hour";
  durationSeconds?: number | null;
  rateNumber?: number | null;       // raw per-minute rate if known (for header)
  date?: string;                    // YYYY-MM-DD
};

export type PaymentItem = { date: string; amount: number };

type Props = {
  logoUrl?: string;
  invoiceNo: number;
  invoiceDate: string;
  fromText: string;
  paymentText: string;
  billToLines: string[];
  rows: InvoiceRow[];
  payments?: PaymentItem[];
  balanceDue: string;               // already formatted (BDT …)
};

/* ---------------- Fonts ---------------- */
Font.register({
  family: "HindSiliguri",
  fonts: [
    { src: "/fonts/HindSiliguri-Regular.ttf" },
    { src: "/fonts/HindSiliguri-Bold.ttf", fontWeight: "bold" },
  ],
});

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: "HindSiliguri",
    fontSize: 10,
    color: "#111",
  },
  row: { flexDirection: "row" },
  spaceBetween: { justifyContent: "space-between" },
  h1: { fontSize: 22, fontWeight: "bold" },
  h2: { fontSize: 12, fontWeight: "bold" },
  small: { fontSize: 9, color: "#444" },
  box: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 8,
  },
  chip: {
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 9,
  },
  tableHeader: {
    backgroundColor: "#2d2d2d",
    color: "#fff",
    fontWeight: "bold",
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  cell: { paddingVertical: 6, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: "#eee" },
});

/* -------------- Helpers -------------- */
const fmt = (n: number) =>
  `BDT ${Number(n || 0).toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;

function minutesAndSeconds(totalSec: number | null | undefined) {
  const t = Number(totalSec || 0);
  const m = Math.floor(t / 60);
  const s = Math.round(t % 60);
  return { m, s };
}

function uniqRatePerMinute(rows: InvoiceRow[]) {
  const rates = new Set<number>();
  rows.forEach((r) => {
    if (typeof r.rateNumber === "number" && Number.isFinite(r.rateNumber)) {
      rates.add(Number(r.rateNumber));
    } else if (r.durationSeconds && r.durationSeconds > 0) {
      const perMin = (Number((r as any)._amountRaw || 0) /
        (r.durationSeconds / 60));
      if (Number.isFinite(perMin)) rates.add(Number(perMin.toFixed(2)));
    }
  });
  return rates;
}

/* -------------- PDF Component -------------- */
function InvoicePDF({
  logoUrl,
  invoiceNo,
  invoiceDate,
  fromText,
  paymentText,
  billToLines,
  rows,
  payments = [],
  balanceDue,
}: Props) {
  // group
  const projectRows = rows
    .filter((r) => r.chargedBy === "project")
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  const timeRows = rows
    .filter((r) => r.chargedBy !== "project")
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  const totalMinutes = timeRows.reduce(
    (s, r) => s + (r.durationSeconds ? r.durationSeconds / 60 : 0),
    0
  );
  const perMinRates = uniqRatePerMinute(timeRows);
  const perMinHeader =
    perMinRates.size === 1
      ? `Per Min Rate ${Array.from(perMinRates)[0]}`
      : "Per Min Items";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={[styles.row, styles.spaceBetween]}>
          <View style={{ width: 140, height: 50 }}>
            {logoUrl ? (
              <Image src={logoUrl} style={{ width: 110, height: 40 }} />
            ) : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.h1}>INVOICE</Text>
            <Text style={{ marginTop: 2 }}># {String(invoiceNo)}</Text>
          </View>
        </View>

        {/* Meta */}
        <View style={[styles.row, styles.spaceBetween, { marginTop: 14 }]}>
          <View style={{ width: "55%" }}>
            <Text style={styles.h2}>From:</Text>
            <Text style={{ marginTop: 6, lineHeight: 1.4 }}>{fromText}</Text>
          </View>

          <View style={{ width: "40%", alignItems: "flex-end" }}>
            <View style={[styles.box, { width: 220 }]}>
              <View style={[styles.row, styles.spaceBetween]}>
                <Text>Date:</Text>
                <Text>{invoiceDate}</Text>
              </View>
              <View style={[styles.row, styles.spaceBetween, { marginTop: 6 }]}>
                <Text>Delivery Date:</Text>
                <Text>{invoiceDate}</Text>
              </View>
            </View>

            <View style={[styles.box, { width: 220, marginTop: 8 }]}>
              <View style={[styles.row, styles.spaceBetween]}>
                <Text style={{ fontWeight: "bold" }}>Balance Due:</Text>
                <Text>{balanceDue}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bill To */}
        <View style={{ marginTop: 12 }}>
          <Text style={styles.h2}>Bill To:</Text>
          <Text style={{ marginTop: 6, lineHeight: 1.4 }}>
            {billToLines.join("\n")}
          </Text>
        </View>

        {/* Three column content */}
        <View style={[styles.row, { marginTop: 14 }]}>
          {/* Left: Project Based table */}
          <View style={{ width: "44%", marginRight: 8 }}>
            <View style={[styles.row, styles.spaceBetween, { marginBottom: 6 }]}>
              <Text style={styles.h2}>Project Based</Text>
              <Text style={styles.chip}>Total: {projectRows.length}</Text>
            </View>

            <View style={[styles.row, styles.tableHeader]}>
              <Text style={{ width: "26%" }}>Date</Text>
              <Text style={{ width: "54%" }}>Serial Project Based</Text>
              <Text style={{ width: "20%", textAlign: "right" }}>Rate</Text>
            </View>

            {projectRows.length === 0 ? (
              <View style={[styles.cell]}>
                <Text style={styles.small}>— No project-based items —</Text>
              </View>
            ) : (
              projectRows.map((r, i) => (
                <View key={i} style={[styles.row, styles.cell]}>
                  <Text style={{ width: "26%" }}>{r.date || "—"}</Text>
                  <Text style={{ width: "54%" }}>
                    {i + 1}. {r.itemText}
                  </Text>
                  <Text style={{ width: "20%", textAlign: "right" }}>
                    {r.rate || r.amount}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* Middle: Per Minute table */}
          <View style={{ width: "34%", marginRight: 8 }}>
            <View style={[styles.row, styles.spaceBetween, { marginBottom: 6 }]}>
              <Text style={styles.h2}>{perMinHeader}</Text>
              <Text style={styles.chip}>
                Total Min: {totalMinutes.toFixed(2)}
              </Text>
            </View>

            <View style={[styles.row, styles.tableHeader]}>
              <Text style={{ width: "36%" }}>Date</Text>
              <Text style={{ width: "38%" }}>Name</Text>
              <Text style={{ width: "13%", textAlign: "right" }}>Min</Text>
              <Text style={{ width: "13%", textAlign: "right" }}>Sec</Text>
            </View>

            {timeRows.length === 0 ? (
              <View style={[styles.cell]}>
                <Text style={styles.small}>— No time-based items —</Text>
              </View>
            ) : (
              timeRows.map((r, i) => {
                const { m, s } = minutesAndSeconds(r.durationSeconds);
                return (
                  <View key={i} style={[styles.row, styles.cell]}>
                    <Text style={{ width: "36%" }}>{r.date || "—"}</Text>
                    <Text style={{ width: "38%" }}>{r.itemText}</Text>
                    <Text style={{ width: "13%", textAlign: "right" }}>
                      {m}
                    </Text>
                    <Text style={{ width: "13%", textAlign: "right" }}>
                      {s}
                    </Text>
                  </View>
                );
              })
            )}
          </View>

          {/* Right: Sidebar (Totals + Payments) */}
          <View style={{ width: "22%" }}>
            <View style={[styles.box]}>
              <Text style={styles.h2}>Total</Text>
              <View style={[styles.row, styles.spaceBetween, { marginTop: 6 }]}>
                <Text>Project Based</Text>
                <Text>{projectRows.length}</Text>
              </View>
              <View style={[styles.row, styles.spaceBetween, { marginTop: 6 }]}>
                <Text>Total Min</Text>
                <Text>{totalMinutes.toFixed(2)}</Text>
              </View>
            </View>

            <View style={[styles.box, { marginTop: 10 }]}>
              <Text style={styles.h2}>Total Due</Text>
              <Text style={{ marginTop: 6, fontSize: 12, fontWeight: "bold" }}>
                {balanceDue}
              </Text>
            </View>

            <View style={[styles.box, { marginTop: 10 }]}>
              <Text style={styles.h2}>Payment History</Text>
              {payments?.length ? (
                payments.map((p, i) => (
                  <View
                    key={i}
                    style={[styles.row, styles.spaceBetween, { marginTop: 6 }]}
                  >
                    <Text>{p.date}</Text>
                    <Text>{fmt(p.amount)}</Text>
                  </View>
                ))
              ) : (
                <Text style={{ marginTop: 6, color: "#666" }}>—</Text>
              )}
            </View>
          </View>
        </View>

        {/* Footer payment block (full width, comfy spacing) */}
        <View style={{ marginTop: 16 }}>
          <Text style={styles.h2}>Payment Method</Text>
          <Text style={{ marginTop: 6, lineHeight: 1.4 }}>{paymentText}</Text>
        </View>
      </Page>
    </Document>
  );
}

/** Build & return a Blob for download */
export async function buildInvoicePdfBlob(props: Props): Promise<Blob> {
  const instance = pdf(<InvoicePDF {...props} />);
  const blob = await instance.toBlob();
  return blob;
}
