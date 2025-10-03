// app/api/clients/bulk-delete/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();

  let ids: string[] = [];
  const ct = req.headers.get("content-type") || "";

  // Accept JSON { ids: [...] } or form-data ids / ids[]
  if (ct.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as any;
    ids = Array.isArray(body?.ids) ? body.ids.map(String) : [];
  } else {
    const form = await req.formData();
    ids = [
      ...form.getAll("ids").map(String),
      ...form.getAll("ids[]").map(String),
    ];
  }

  ids = Array.from(new Set(ids.filter((v) => v && v !== "on"))); // clean + dedupe

  const back = new URL("/clients", req.url);
  back.searchParams.set("bulk", "1");

  if (ids.length === 0) {
    back.searchParams.set("deleted", "0");
    return NextResponse.redirect(back, { status: 303 });
  }

  try {
    // Gather dependent IDs once
    const [{ data: invs, error: invErr }, { data: works, error: wErr }] = await Promise.all([
      supabase.from("invoices").select("id").in("client_id", ids),
      supabase.from("work_entries").select("id").in("client_id", ids),
    ]);
    if (invErr) throw invErr;
    if (wErr) throw wErr;

    const invoiceIds = (invs ?? []).map((r: any) => r.id);
    const workIds = (works ?? []).map((r: any) => r.id);

    // 1) Delete invoice_items FIRST
    if (invoiceIds.length > 0) {
      const { error } = await supabase
        .from("invoice_items")
        .delete()
        .in("invoice_id", invoiceIds);
      if (error) throw error;
    }
    if (workIds.length > 0) {
      // Defensive: remove any items linked directly by work_entry_id
      const { error } = await supabase
        .from("invoice_items")
        .delete()
        .in("work_entry_id", workIds);
      if (error) throw error;
    }

    // 2) Delete work entries
    if (workIds.length > 0) {
      const { error } = await supabase.from("work_entries").delete().in("id", workIds);
      if (error) throw error;
    } else {
      await supabase.from("work_entries").delete().in("client_id", ids);
    }

    // 3) Delete payments
    const { error: payErr } = await supabase
      .from("payment_entries")
      .delete()
      .in("client_id", ids);
    if (payErr) throw payErr;

    // 4) Delete invoices (now that items are gone)
    if (invoiceIds.length > 0) {
      const { error } = await supabase.from("invoices").delete().in("id", invoiceIds);
      if (error) throw error;
    } else {
      await supabase.from("invoices").delete().in("client_id", ids);
    }

    // 5) Finally delete clients
    const { error: clientErr } = await supabase.from("clients").delete().in("id", ids);
    if (clientErr) throw clientErr;

    back.searchParams.set("deleted", String(ids.length));
    return NextResponse.redirect(back, { status: 303 });
  } catch (e: any) {
    back.searchParams.set("error", (e?.message || "Failed to delete").slice(0, 200));
    return NextResponse.redirect(back, { status: 303 });
  }
}
