// app/api/work/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Basis = "second" | "minute" | "hour" | "project";
type PricingMode = "auto" | "manual_rate" | "manual_total";

type Body = {
  date?: string;
  project_name?: string;
  charged_by_snapshot?: Basis;
  pricing_mode?: PricingMode;
  duration_seconds?: number | null;
  units?: number | null;
  rate_snapshot?: number | null;
  amount_due?: number | null;
  override_reason?: string | null;
  note?: string | null;
  delivered_at?: string | null;
  variant_label?: string | null; // NEW
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const body = (await req.json()) as Body;
    const supabase = await createClient();

    // Build update object and prune undefined keys so we don't overwrite by mistake
    const updateRaw: Body & { updated_at: string } = {
      date: body.date,
      project_name: body.project_name,
      charged_by_snapshot: body.charged_by_snapshot,
      pricing_mode: body.pricing_mode,
      duration_seconds: body.duration_seconds ?? null,
      units: body.units ?? null,
      rate_snapshot: body.rate_snapshot ?? null,
      amount_due: body.amount_due ?? null,
      override_reason: body.override_reason ?? null,
      note: body.note ?? null,
      delivered_at: body.delivered_at ?? null,
      variant_label: body.variant_label ?? null, // NEW
      updated_at: new Date().toISOString(),
    };
    const update = Object.fromEntries(
      Object.entries(updateRaw).filter(([, v]) => v !== undefined)
    ) as Body & { updated_at: string };

    const { data, error } = await supabase
      .from("work_entries")
      .update(update)
      .eq("id", id)
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, id: data!.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const supabase = await createClient();
    const { error } = await supabase.from("work_entries").delete().eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
