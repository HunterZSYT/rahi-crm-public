"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
  pdf,
} from "@react-pdf/renderer";

/** Register Bangla fonts (regular + bold) */
Font.register({
  family: "HindSiliguri",
  fonts: [
    { src: "/fonts/HindSiliguri-Regular.ttf", fontWeight: "normal" },
    { src: "/fonts/HindSiliguri-Bold.ttf", fontWeight: "bold" },
  ],
});

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingHorizontal: 40,
    fontFamily: "HindSiliguri",
    fontSize: 10,
    color: "#111",
  },
  row: { flexDirection: "row" },
  between: { flexDirection: "row", justifyContent: "space-between" },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  mt16: { marginTop: 16 },
  bold: { fontWeight: "bold" },
  title: { fontSize: 24, fontWeight: "bold" },
  small: { fontSize: 9, color: "#444" },
  box: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },

  table: { marginTop: 16, borderRadius: 6, overflow: "hidden" },
  th: { backgroundColor: "#2d2d2d", color: "#fff", padding: 8, fontWeight: "bold" },
  td: { padding: 8, borderBottomWidth: 1, borderBottomColor: "#eee" },
  colItem: { width: "36%" },
  colVariant: { width: "14%" },
  colDuration: { width: "16%" },
  colQty: { width: "10%", textAlign: "center" },
  colRate: { width: "12%", textAlign: "right" },
  colAmount: { width: "12%", textAlign: "right" },
});

export type InvoiceRow = {
  itemText: string;       // Bengali ok
  variant: string;
  durationText: string;   // e.g., "3m 12s" or "1 project"
  qty: number | string;   // 2.333
  rate: string;           // "BDT 50"
  amount: string;         // "BDT 150"
};

type Props = {
  logoUrl?: string;         // "/logo.jpg" or "/logo.png"
  invoiceNo: string | number;
  invoiceDate: string;      // YYYY-MM-DD
  fromText: string;         // Bengali ok
  paymentText: string;      // Bengali ok
  billToLines: string[];    // lines for Bill To
  rows: InvoiceRow[];
  balanceDue: string;       // "BDT 6,049.29"
};

function InvoiceDoc({
  logoUrl,
  invoiceNo,
  invoiceDate,
  fromText,
  paymentText,
  billToLines,
  rows,
  balanceDue,
}: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* header */}
        <View style={styles.between}>
          <View>
            {logoUrl ? (
              <Image src={logoUrl} style={{ width: 110, height: 40 }} />
            ) : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={styles.small}># {String(invoiceNo)}</Text>
          </View>
        </View>

        {/* dates + balance */}
        <View style={[styles.mt12, styles.between, { alignItems: "center" }]}>
          <View>
            <Text>Date:  {invoiceDate}</Text>
            <Text>Delivery Date:  {invoiceDate}</Text>
          </View>
          <View style={styles.box}>
            <Text style={{ fontWeight: "bold" }}>Balance Due:</Text>
            <Text style={{ textAlign: "right" }}>{balanceDue}</Text>
          </View>
        </View>

        {/* from / bill to */}
        <View style={[styles.mt16, styles.row]}>
          <View style={{ width: "50%", paddingRight: 12 }}>
            <Text style={styles.bold}>From:</Text>
            <Text style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{fromText}</Text>
          </View>
          <View style={{ width: "50%", paddingLeft: 12 }}>
            <Text style={styles.bold}>Bill To:</Text>
            <View style={{ marginTop: 6 }}>
              {billToLines.map((l, i) => (
                <Text key={i}>{l}</Text>
              ))}
            </View>
          </View>
        </View>

        {/* table */}
        <View style={styles.table}>
          {/* header */}
          <View style={[styles.row]}>
            <Text style={[styles.th, styles.colItem]}>Item</Text>
            <Text style={[styles.th, styles.colVariant]}>Variant</Text>
            <Text style={[styles.th, styles.colDuration]}>Duration/Units</Text>
            <Text style={[styles.th, styles.colQty]}>Qty</Text>
            <Text style={[styles.th, styles.colRate]}>Rate</Text>
            <Text style={[styles.th, styles.colAmount]}>Amount</Text>
          </View>

          {/* body */}
          {rows.map((r, i) => (
            <View key={i} style={styles.row}>
              <Text style={[styles.td, styles.colItem]}>{r.itemText}</Text>
              <Text style={[styles.td, styles.colVariant]}>{r.variant || "—"}</Text>
              <Text style={[styles.td, styles.colDuration]}>{r.durationText}</Text>
              <Text style={[styles.td, styles.colQty]}>{String(r.qty)}</Text>
              <Text style={[styles.td, styles.colRate]}>{r.rate}</Text>
              <Text style={[styles.td, styles.colAmount]}>{r.amount}</Text>
            </View>
          ))}
        </View>

        {/* footer payment */}
        <View style={[styles.mt16]}>
          <Text>{paymentText}</Text>
        </View>
      </Page>
    </Document>
  );
}

/** Build the PDF as a Blob you can download */
export async function buildInvoicePdfBlob(props: Props): Promise<Blob> {
  const instance = pdf(<InvoiceDoc {...props} />);
  const blob = await instance.toBlob();
  return blob;
}
