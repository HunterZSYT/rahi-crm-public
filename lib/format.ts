// lib/format.ts
export function formatMoney(n: string | number) {
  const num = Number(n || 0);
  return `৳${num.toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;
}

export function formatDuration(seconds?: number | null) {
  const s = Number(seconds || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}h ${m}m ${sec}s`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export function formatDateLong(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  // 2 March 2025
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
