// app/api/export/all/route.ts
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/export/all
 * Returns a JSON attachment containing all app tables.
 * (Add/remove tables below if you want to include more/less.)
 */
export async function GET() {
  const supabase = await createClient();

  // Pull everything you care about
  const [{ data: clients, error: e1 }] = await Promise.all([
    supabase.from("clients").select("*").order("created_at", { ascending: true }),
  ]);
  if (e1) return new Response(JSON.stringify({ error: e1.message }), { status: 500 });

  const [{ data: work_entries, error: e2 }] = await Promise.all([
    supabase.from("work_entries").select("*").order("date", { ascending: true }),
  ]);
  if (e2) return new Response(JSON.stringify({ error: e2.message }), { status: 500 });

  const [{ data: payment_entries, error: e3 }] = await Promise.all([
    supabase.from("payment_entries").select("*").order("date", { ascending: true }),
  ]);
  if (e3) return new Response(JSON.stringify({ error: e3.message }), { status: 500 });

  const [{ data: client_rate_changes, error: e4 }] = await Promise.all([
    supabase.from("client_rate_changes").select("*").order("effective_from", { ascending: true }),
  ]);
  if (e4) return new Response(JSON.stringify({ error: e4.message }), { status: 500 });

  // Optional: include app_config (single row)
  const { data: app_config, error: e5 } = await supabase.from("app_config").select("*");
  if (e5) return new Response(JSON.stringify({ error: e5.message }), { status: 500 });

  const payload = {
    meta: {
      exported_at: new Date().toISOString(),
      tables: {
        clients: clients?.length ?? 0,
        work_entries: work_entries?.length ?? 0,
        payment_entries: payment_entries?.length ?? 0,
        client_rate_changes: client_rate_changes?.length ?? 0,
        app_config: app_config?.length ?? 0,
      },
      // bump if you ever change shape
      export_version: 1,
    },
    data: {
      clients: clients ?? [],
      work_entries: work_entries ?? [],
      payment_entries: payment_entries ?? [],
      client_rate_changes: client_rate_changes ?? [],
      app_config: app_config ?? [],
    },
  };

  const filename = `db-export-${new Date().toISOString().slice(0, 10)}.json`;
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
