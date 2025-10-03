import { createClient } from "@/lib/supabase/server";

/** Small CSV helper */
function escapeCsv(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function toCsv(rows: Record<string, any>[], columns: { key: string; label?: string }[]) {
  const header = columns.map(c => escapeCsv(c.label ?? c.key)).join(",");
  const lines = rows.map(r => columns.map(c => escapeCsv(r[c.key])).join(","));
  return [header, ...lines].join("\n");
}

function asDateOnly(v: string | null): string | null {
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const table = url.searchParams.get("table"); // clients|work|payments
  const clientIdsParam = url.searchParams.get("client_ids"); // "id1,id2"
  const from = asDateOnly(url.searchParams.get("from"));
  const to = asDateOnly(url.searchParams.get("to"));

  if (!table || !["clients", "work", "payments"].includes(table)) {
    return new Response(JSON.stringify({ error: "Invalid table" }), { status: 400 });
  }

  const supabase = await createClient();

  // Build ID->name map (used for work & payments)
  const { data: clientsAll, error: cErr } = await supabase
    .from("clients")
    .select("id,name")
    .order("name", { ascending: true });
  if (cErr) return new Response(JSON.stringify({ error: cErr.message }), { status: 500 });
  const idToName = new Map((clientsAll ?? []).map((c: any) => [c.id, c.name]));

  let filename = `${table}-${new Date().toISOString().slice(0, 10)}.csv`;

  if (table === "clients") {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

    const rows = (data ?? []).map((r: any) => ({
      name: r.name,
      charged_by: r.charged_by,
      rate: r.rate,
      status: r.status,
      contact_name: r.contact_name ?? "",
      designation: r.designation ?? "",
      email: r.email ?? "",
      phone: r.phone ?? "",
      note: r.note ?? "",
      created_at: r.created_at?.slice(0, 10) ?? "",
    }));

    const csv = toCsv(rows, [
      { key: "name" },
      { key: "charged_by" },
      { key: "rate" },
      { key: "status" },
      { key: "contact_name" },
      { key: "designation" },
      { key: "email" },
      { key: "phone" },
      { key: "note" },
      { key: "created_at" },
    ]);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (table === "work") {
    const q = supabase
      .from("work_entries")
      .select("id,client_id,project_name,rate_snapshot,charged_by_snapshot,pricing_mode,duration_seconds,units,amount_due,status,date,delivered_at,note,variant_label")
      .order("date", { ascending: true });

    const clientIds = clientIdsParam?.split(",").map(s => s.trim()).filter(Boolean) ?? [];
    if (clientIds.length) q.in("client_id", clientIds);
    if (from) q.gte("date", from);
    if (to) q.lte("date", to);

    const { data, error } = await q;
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

    const rows = (data ?? []).map((r: any) => {
      const ds = Number(r.duration_seconds || 0);
      const minutes = ds && r.charged_by_snapshot !== "project" ? Math.floor(ds / 60) : "";
      const seconds = ds && r.charged_by_snapshot !== "project" ? ds % 60 : "";
      // expose manual_rate only when pricing_mode === "manual_rate"
      const manual_rate = r.pricing_mode === "manual_rate" ? Number(r.rate_snapshot || 0) : "";
      // expose amount only when pricing_mode === "manual_total"
      const amount = r.pricing_mode === "manual_total" ? Number(r.amount_due || 0) : "";

      return {
        client_name: idToName.get(r.client_id) ?? r.client_id,
        work_name: r.project_name,
        rate: r.rate_snapshot ?? "",
        basis: r.charged_by_snapshot ?? "",
        minutes,
        seconds,
        duration_seconds: r.charged_by_snapshot === "project" ? "" : (r.duration_seconds ?? ""),
        units: r.charged_by_snapshot === "project" ? (r.units ?? "") : (r.units ?? ""),
        amount,
        manual_rate,
        pricing_mode: r.pricing_mode,
        status: r.status,
        date: r.date ?? "",
        delivered_at: r.delivered_at ? String(r.delivered_at).slice(0, 10) : "",
        note: r.note ?? "",
        variant_label: r.variant_label ?? "",
      };
    });

    const csv = toCsv(rows, [
      { key: "client_name" },
      { key: "work_name" },
      { key: "rate" },
      { key: "basis" },
      { key: "minutes" },
      { key: "seconds" },
      { key: "duration_seconds" },
      { key: "units" },
      { key: "amount" },
      { key: "manual_rate" },
      { key: "pricing_mode" },
      { key: "status" },
      { key: "date" },
      { key: "delivered_at" },
      { key: "note" },
      { key: "variant_label" },
    ]);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // payments
  {
    const q = supabase
      .from("payment_entries")
      .select("id,client_id,amount,medium,date,note")
      .order("date", { ascending: true });

    const clientIds = clientIdsParam?.split(",").map(s => s.trim()).filter(Boolean) ?? [];
    if (clientIds.length) q.in("client_id", clientIds);
    if (from) q.gte("date", from);
    if (to) q.lte("date", to);

    const { data, error } = await q;
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

    const rows = (data ?? []).map((r: any) => ({
      client_name: idToName.get(r.client_id) ?? r.client_id,
      amount: r.amount,
      medium: r.medium,
      date: r.date ?? "",
      note: r.note ?? "",
    }));

    const csv = toCsv(rows, [
      { key: "client_name" },
      { key: "amount" },
      { key: "medium" },
      { key: "date" },
      { key: "note" },
    ]);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }
}
