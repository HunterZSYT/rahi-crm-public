// app/api/invoices/route.ts
import { createClient } from "@/lib/supabase/server";

type Body = {
  client_id: string;
  work_ids: string[];              // selected work rows (any status; invoiced or not)
  issue_date: string;              // YYYY-MM-DD
  number?: number | null;          // if provided and exists => update; if blank => allocate
  from_text: string;
  payment_text: string;
  remember_defaults?: boolean;
};

function money(n: any) {
  const v = Number(n || 0);
  return isFinite(v) ? v : 0;
}

function lineDescription(w: any) {
  const parts = [
    w.project_name || "—",
    w.variant_label ? `(${w.variant_label})` : "",
    w.date ? `— ${w.date}` : "",
  ].filter(Boolean);
  return parts.join(" ");
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const body = (await req.json()) as Body;

  if (!body.client_id || !Array.isArray(body.work_ids)) {
    return new Response(JSON.stringify({ error: "client_id and work_ids are required" }), { status: 400 });
  }

  try {
    // --- Fetch client snapshot for Bill To ---
    const { data: client, error: cErr } = await supabase
      .from("clients")
      .select("name, designation, contact_name, phone, email")
      .eq("id", body.client_id)
      .single();

    if (cErr || !client) throw new Error(cErr?.message || "Client not found");

    const bill_to = [
      client.name,
      client.designation || null,
      client.contact_name || null,
      client.phone ? `Phone: ${client.phone}` : null,
      client.email || null,
    ].filter(Boolean).join("\n");

    // --- Load selected work rows to compute totals & items ---
    const { data: works, error: wErr } = await supabase
      .from("work_entries")
      .select("id, date, project_name, amount_due, variant_label, units, rate_snapshot, charged_by_snapshot, duration_seconds")
      .in("id", body.work_ids);

    if (wErr) throw new Error(wErr.message);

    const subtotal = money(works?.reduce((s, w) => s + money(w.amount_due), 0));
    const total = subtotal;

    // --- Did user type an existing invoice number? ---
    let number = body.number ?? null;
    let existing: { id: string; number: number } | null = null;

    if (number != null) {
      const { data: invByNo } = await supabase
        .from("invoices")
        .select("id, number")
        .eq("number", number)
        .maybeSingle();
      if (invByNo) existing = invByNo;
    }

    // --- Allocate new number if needed ---
    if (!existing && (number == null || Number.isNaN(number))) {
      const { data: settings, error: sErr } = await supabase
        .from("invoice_settings")
        .select("next_number")
        .single();
      if (sErr) throw new Error(sErr.message);
      number = settings?.next_number ?? 100;
    }

    // --- Upsert the invoice by number ---
    const invoicePatch = {
      number,                           // unique
      client_id: body.client_id,
      issue_date: body.issue_date,
      due_date: null,
      bill_to,
      from_text: body.from_text,
      payment_text: body.payment_text,
      currency: "BDT",
      subtotal,
      total,
    };

    const { data: upserted, error: upErr } = await supabase
      .from("invoices")
      .upsert(invoicePatch, { onConflict: "number" })
      .select("id, number")
      .single();
    if (upErr) throw new Error(upErr.message);

    const invoiceId = upserted!.id;
    const invoiceNumber = upserted!.number;

    // --- Replace invoice items (clear then insert) ---
    const { error: delItemsErr } = await supabase
      .from("invoice_items")
      .delete()
      .eq("invoice_id", invoiceId);
    if (delItemsErr) throw new Error(delItemsErr.message);

    // Detach any rows previously linked to this invoice, then attach chosen ones
    const { error: clearLinksErr } = await supabase
      .from("work_entries")
      .update({ invoice_id: null })
      .eq("invoice_id", invoiceId);
    if (clearLinksErr) throw new Error(clearLinksErr.message);

    if (works && works.length) {
      const items = works.map((w, i) => ({
        invoice_id: invoiceId,
        work_entry_id: w.id,
        description: lineDescription(w),
        quantity: 1,
        rate: money(w.amount_due),
        amount: money(w.amount_due),
        sort_order: i,
      }));

      const { error: insItemsErr } = await supabase.from("invoice_items").insert(items);
      if (insItemsErr) throw new Error(insItemsErr.message);

      const { error: linkErr } = await supabase
        .from("work_entries")
        .update({ invoice_id: invoiceId })
        .in("id", works.map((w) => w.id));
      if (linkErr) throw new Error(linkErr.message);
    }

    // --- Bump next_number only when we actually allocated a new number ---
    if (!existing && (body.number == null || Number.isNaN(body.number))) {
      await supabase
        .from("invoice_settings")
        .update({ next_number: Number(number) + 1 });
    }

    // --- Optionally persist defaults ---
    if (body.remember_defaults) {
      await supabase
        .from("invoice_settings")
        .update({
          from_text: body.from_text,
          payment_text: body.payment_text,
        });
    }

    return new Response(JSON.stringify({ id: invoiceId, number: invoiceNumber }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Failed to create/update invoice" }), { status: 500 });
  }
}
