// app/api/invoice/payments/route.ts
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId");
  if (!clientId) {
    return new Response(JSON.stringify({ error: "Missing clientId" }), { status: 400 });
  }
  const { data, error } = await supabase
    .from("payment_entries")
    .select("id, date, amount, medium, note")
    .eq("client_id", clientId)
    .order("date", { ascending: true });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ payments: data ?? [] }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
