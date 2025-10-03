// app/api/clients/[id]/work/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Basis = "second" | "minute" | "hour" | "project";
type PricingMode = "auto" | "manual_rate" | "manual_total";

function unitsFromSeconds(basis: Basis, s: number) {
  const secs = Math.max(0, Number(s || 0));
  if (basis === "second") return secs;
  if (basis === "minute") return secs / 60;
  if (basis === "hour") return secs / 3600;
  return 1; // "project" handled separately
}

/** Create a work entry */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: client_id } = await ctx.params; // <-- await params
    const body = await req.json();
    const supabase = await createClient();

    // Accept both payload styles
    const date: string = body.date;
    const project_name: string = body.project_name ?? "";
    const basis: Basis =
      (body.charged_by_snapshot as Basis) ?? (body.basis as Basis) ?? "minute";
    const pricing_mode: PricingMode =
      (body.pricing_mode as PricingMode) ?? "auto";

    const delivered_at: string | null =
      body.delivered_at ?? (body.deliver_now ? new Date().toISOString() : null);
    const status: "delivered" | "processing" = delivered_at
      ? "delivered"
      : "processing";

    const duration_seconds: number | null =
      basis === "project"
        ? null
        : typeof body.duration_seconds === "number"
        ? Math.max(0, body.duration_seconds)
        : null;

    let units: number | null;
    if (basis === "project") {
      units = body.units != null ? Math.max(1, Number(body.units)) : 1;
    } else {
      const derived = unitsFromSeconds(basis, Number(duration_seconds || 0));
      units = body.units != null ? Number(body.units) : derived;
    }

    let rate_snapshot: number | null = null;
    let amount_due: number | null = null;

    if (pricing_mode === "manual_total") {
      rate_snapshot = null;
      amount_due =
        body.amount_due != null
          ? Number(body.amount_due)
          : Number(body.manual_total || 0);
    } else {
      const resolvedRate =
        body.rate_snapshot != null
          ? Number(body.rate_snapshot)
          : pricing_mode === "manual_rate"
          ? Number(body.manual_rate || 0)
          : Number(body.client_rate_snapshot || 0);

      rate_snapshot = resolvedRate;
      amount_due =
        body.amount_due != null
          ? Number(body.amount_due)
          : Math.max(0, Number(units || 0) * resolvedRate);
    }

    const insert = {
      client_id,
      date,
      project_name,
      status,
      pricing_mode,
      charged_by_snapshot: basis,
      rate_snapshot,
      duration_seconds: basis === "project" ? null : Number(duration_seconds || 0),
      units,
      amount_due,
      override_reason: body.override_reason ?? null,
      note: body.note ?? null,
      delivered_at,
      // persist the Variant label
      variant_label: body.variant_label ?? null,
    };

    const { data, error } = await supabase
      .from("work_entries")
      .insert(insert)
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, id: data!.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** Toggle delivered/processing for a specific work id (used by status-toggle) */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await ctx.params; // <-- await params
    const { id, delivered }: { id: string; delivered: boolean } =
      await req.json();

    if (!id) {
      return NextResponse.json({ error: "Missing work id" }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("work_entries")
      .update({
        status: delivered ? "delivered" : "processing",
        delivered_at: delivered ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .eq("client_id", clientId); // optional guard

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
