// app/(app)/_lib/stats.ts
import { createClient } from "@/lib/supabase/server";

type TotalsOpts = { start?: string | null; end?: string | null };

export async function getGlobalTotals(opts: TotalsOpts = {}) {
  const { start = null, end = null } = opts;
  const supabase = await createClient();

  // Delivered work in range
  const worksQ = supabase
    .from("work_entries")
    .select("client_id, amount_due, status, date")
    .eq("status", "delivered");
  if (start) worksQ.gte("date", start);
  if (end) worksQ.lte("date", end);

  // Payments in range
  const paysQ = supabase
    .from("payment_entries")
    .select("client_id, amount, date");
  if (start) paysQ.gte("date", start);
  if (end) paysQ.lte("date", end);

  const [{ data: works }, { data: pays }] = await Promise.all([worksQ, paysQ]);

  // Aggregate per client
  const deliveredByClient = new Map<string, number>();
  const paymentsByClient  = new Map<string, number>();

  for (const w of works ?? []) {
    const key = w.client_id as string;
    deliveredByClient.set(key, (deliveredByClient.get(key) || 0) + Number(w.amount_due || 0));
  }
  for (const p of pays ?? []) {
    const key = p.client_id as string;
    paymentsByClient.set(key, (paymentsByClient.get(key) || 0) + Number(p.amount || 0));
  }

  // Per-client dues = max(delivered - payments, 0)
  let totalDues = 0;
  for (const [clientId, delivered] of deliveredByClient.entries()) {
    const paid = paymentsByClient.get(clientId) || 0;
    totalDues += Math.max(0, delivered - paid);
  }

  const totalPayments =
    [...paymentsByClient.values()].reduce((s, v) => s + v, 0);

  // ✅ Earnings are “what’s left after clearing dues from payments”
  const totalEarnings = Math.max(0, totalPayments - totalDues);

  return { totalPayments, totalDues, totalEarnings };
}
