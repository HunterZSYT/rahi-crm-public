// app/api/payments/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Body = {
  date?: string;
  amount?: number | null;
  medium?: string;
  note?: string | null;
};
type Params = { id: string };

export async function PATCH(req: Request, ctx: { params: Promise<Params> }) {
  try {
    const { id } = await ctx.params; // await params in app router
    const body: Body = await req.json();

    const supabase = await createClient();

    // Only include provided fields
    const update: Partial<Body> = {};
    if (body.date !== undefined) update.date = body.date;
    if (body.amount !== undefined) update.amount = body.amount;
    if (body.medium !== undefined) update.medium = body.medium;
    if (body.note !== undefined) update.note = body.note ?? null;

    const { data, error } = await supabase
      .from("payment_entries")
      .update(update)
      .eq("id", id)
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, id: data!.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update payment";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<Params> }) {
  try {
    const { id } = await ctx.params;
    const supabase = await createClient();

    const { error } = await supabase
      .from("payment_entries")
      .delete()
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete payment";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
