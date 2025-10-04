import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/clients/:id/variants -> { variants: [{label, count}] } */
export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch labels and count in JS (works across supabase-js versions)
    const { data, error } = await supabase
      .from("work_entries")
      .select("variant_label")
      .eq("client_id", id)
      .not("variant_label", "is", null)
      .neq("variant_label", "");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const counts = new Map<string, number>();
    for (const r of (data ?? []) as Array<{ variant_label: string }>) {
      const label = String(r.variant_label);
      counts.set(label, (counts.get(label) || 0) + 1);
    }

    const variants = Array.from(counts, ([label, count]) => ({ label, count }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return NextResponse.json({ variants });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

/** PATCH /api/clients/:id/variants  body: { oldLabel, newLabel } */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const { oldLabel, newLabel } = (await req.json()) as {
      oldLabel?: string;
      newLabel?: string;
    };

    if (!oldLabel || !newLabel) {
      return NextResponse.json({ error: "oldLabel and newLabel are required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("work_entries")
      .update({ variant_label: newLabel })
      .eq("client_id", id)
      .eq("variant_label", oldLabel);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

/** DELETE /api/clients/:id/variants  body: { label } */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const { label } = (await req.json()) as { label?: string };

    if (!label) return NextResponse.json({ error: "label is required" }, { status: 400 });

    const supabase = await createClient();
    const { error } = await supabase
      .from("work_entries")
      .update({ variant_label: null })
      .eq("client_id", id)
      .eq("variant_label", label);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
