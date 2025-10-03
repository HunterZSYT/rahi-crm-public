// app/api/invoice/works/route.ts
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const url = new URL(req.url);

  const clientId = url.searchParams.get("clientId");
  const from = url.searchParams.get("from"); // optional YYYY-MM-DD
  const to = url.searchParams.get("to");     // optional YYYY-MM-DD
  const status = url.searchParams.get("status"); // optional: delivered | processing | (omit)

  if (!clientId) {
    return new Response(JSON.stringify({ error: "Missing clientId" }), { status: 400 });
  }

  let q = supabase
    .from("work_entries")
    .select(
      `
        id,
        date,
        project_name,
        amount_due,
        variant_label,
        note,
        charged_by_snapshot,
        duration_seconds,
        units,
        rate_snapshot,
        status,
        invoice_id
      `
    )
    .eq("client_id", clientId);

  if (from) q = q.gte("date", from);
  if (to) q = q.lte("date", to);
  if (status && status !== "all") q = q.eq("status", status);
  // NOTE: no invoice_id filter here (you asked for "no restrictions")

  const { data, error } = await q.order("date", { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ works: data ?? [] }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
