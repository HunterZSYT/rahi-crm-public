// app/(app)/clients/_lib/table.ts
export function money(n: number | string | null | undefined) {
  const num = Number(n || 0);
  return `৳${num.toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;
}
export function daysBetween(minISO?: string | null, maxISO?: string | null) {
  if (!minISO || !maxISO) return 0;
  const a = new Date(minISO);
  const b = new Date(maxISO);
  return Math.max(0, Math.round((+b - +a) / 86400000) + 1);
}
export function fmtLongDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

// read array params like ?status=active&status=closed
export function arrParam(
  sp: Record<string, string | string[] | undefined>,
  key: string
): string[] {
  const v = sp[key];
  if (!v) return [];
  if (Array.isArray(v)) return v as string[];
  return typeof v === "string" ? [v] : [];
}

// preserve chosen params in links/forms
export function keepParams(
  base: Record<string, string | string[] | undefined>,
  include: string[],
  overrides?: Record<string, string | string[] | undefined>
) {
  const p = new URLSearchParams();
  for (const k of include) {
    const v = base[k];
    if (!v) continue;
    if (Array.isArray(v)) (v as string[]).forEach((x) => p.append(k, x));
    else p.set(k, v as string);
  }
  if (overrides) {
    for (const [k, v] of Object.entries(overrides)) {
      if (v == null) continue;
      if (Array.isArray(v)) (v as string[]).forEach((x) => p.append(k, x));
      else p.set(k, v as string);
    }
  }
  const s = p.toString();
  return s ? `/clients?${s}` : "/clients";
}
