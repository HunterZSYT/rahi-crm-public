import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id,name,status")
    .order("name", { ascending: true });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify({ clients: data ?? [] }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
