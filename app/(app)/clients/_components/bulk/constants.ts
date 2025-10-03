export type TabKey = "clients" | "work" | "payments";

/* ----------------------------- UI copy / help ----------------------------- */
export const HELP: Record<TabKey, string> = {
  clients:
    "Required: name. Optional: charged_by (second|minute|hour|project), rate (number), status (active|closed|payment_expired), contact_name, designation, email, phone, note, created_at (YYYY-MM-DD).",
  work:
    "Required: client_name, work_name. Optional: basis (second|minute|hour|project), rate (number, used in auto mode), minutes, seconds, duration_seconds, units (for project basis), amount (manual_total), manual_rate (for manual_rate), pricing_mode (auto|manual_rate|manual_total), status (delivered|processing), date (YYYY-MM-DD), delivered_at (YYYY-MM-DD), note, variant_label (alias: work_variant).",
  payments:
    "Required: client_name, amount. Optional: date (YYYY-MM-DD), medium (bkash|nagad|bank|cash|other), note.",
};
// Back-compat for older imports:
export const HELP_TEXT = HELP;

/* --------------------------- required/optional keys ----------------------- */
export const REQUIRED: Record<TabKey, string[]> = {
  clients: ["name"],
  work: ["client_name", "work_name"],
  payments: ["client_name", "amount"],
};

export const OPTIONAL_BY_TAB: Record<TabKey, string[]> = {
  clients: [
    "charged_by",
    "rate",
    "status",
    "contact_name",
    "designation",
    "email",
    "phone",
    "note",
    "created_at",
  ],
  work: [
    "basis",
    "rate",
    "minutes",
    "seconds",
    "duration_seconds",
    "units",
    "amount",
    "manual_rate",
    "pricing_mode",
    "status",
    "date",
    "delivered_at",
    "note",
    "variant_label",
  ],
  payments: ["date", "medium", "note"],
};

/* --------------------------- header aliases for CSV ----------------------- */
const norm = (v: unknown) =>
  String(v ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w]/g, "");

export const ALIASES: Record<string, string[]> = {
  // clients
  name: ["name", "client", "client_name"],
  charged_by: ["charged_by", "basis", "chargedby"],
  rate: ["rate", "default_rate", "client_rate", "price"],
  status: ["status", "client_status"],
  contact_name: ["contact_name", "contact", "person", "contactname"],
  designation: ["designation", "title", "role", "position"],
  email: ["email", "mail", "e_mail"],
  phone: ["phone", "mobile", "telephone", "cell", "contact_phone"],
  note: ["note", "notes", "remarks", "comment"],
  created_at: ["created_at", "client_date", "date", "joined_on"],

  // shared “client” column
  client_name: ["client_name", "client", "customer", "account"],

  // work
  work_name: ["work_name", "work", "project_name", "project", "task"],
  basis: ["basis", "charged_by", "charged_by_snapshot"],
  minutes: ["minutes", "mins"],
  seconds: ["seconds", "secs"],
  duration_seconds: ["duration_seconds", "duration", "total_seconds", "time_seconds"],
  units: ["units", "project_units", "qty", "quantity"],
  amount: ["amount", "total", "manual_total", "price_total", "paid", "payment", "value"],
  manual_rate: ["manual_rate", "custom_rate"],
  pricing_mode: ["pricing_mode", "mode"],
  date: ["date", "work_date"],
  delivered_at: ["delivered_at", "delivered", "delivery_date"],
  variant_label: ["variant_label", "variant", "work_variant", "label"],

  // payments (back-compat)
  amount_payments: ["amount", "paid", "payment", "value"],
  medium: ["medium", "method", "channel"],
};

/**
 * Find the first header match from `headers` for either:
 *  - an alias key (string) present in ALIASES, OR
 *  - an explicit list of candidate strings.
 * Returns "" when not found (easier for your mapping code).
 */
export function findHeader(
  headers: string[],
  candidates: string[] | string
): string {
  const wanted = Array.isArray(candidates)
    ? candidates.map(norm)
    : (ALIASES[candidates] ?? [candidates]).map(norm);

  const normalized = headers.map((h) => ({ raw: h, n: norm(h) }));
  for (const cand of wanted) {
    const hit = normalized.find((h) => h.n === cand);
    if (hit) return hit.raw;
  }
  return "";
}

/* ------------------------------ file helpers ------------------------------ */
export const ACCEPT = ".csv,text/csv";

const csv = (rows: (string | number)[][]) =>
  rows.map((r) => r.map((c) => String(c ?? "")).join(",")).join("\n");

export const SAMPLE_CSV: Record<TabKey, string> = {
  clients: csv([
    ["name", "charged_by", "rate", "status", "contact_name", "designation", "email", "phone", "note", "created_at"],
    ["Acme Media", "minute", "50", "active", "Alex Doe", "Manager", "alex@acme.test", "+8801000000000", "VIP client", "2025-10-02"],
  ]),
  work: csv([
    ["client_name","work_name","rate","basis","minutes","seconds","duration_seconds","units","amount","manual_rate","pricing_mode","status","date","delivered_at","note","variant_label"],
    ["Acme Media","Landing page","50","minute","30","0","","","","","auto","delivered","2025-10-02","2025-10-02","Homepage hero","Voice-Over"],
    ["Acme Media","Logo design","4000","project","","","","2","","","auto","delivered","2025-10-03","2025-10-03","Brand refresh","Variant A"],
    ["Acme Media","One-off fixed","","minute","","","","","2500","","manual_total","delivered","2025-10-04","2025-10-04","Flat price",""],
  ]),
  payments: csv([
    ["client_name", "amount", "medium", "date", "note"],
    ["Acme Media", "1500", "bkash", "2025-10-05", "advance"],
  ]),
};

export const fileNameFor = (tab: TabKey) =>
  tab === "clients" ? "clients_sample.csv" : tab === "work" ? "work_sample.csv" : "payments_sample.csv";

export const sampleCsv = (tab: TabKey) => SAMPLE_CSV[tab];

export function downloadBlob(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
