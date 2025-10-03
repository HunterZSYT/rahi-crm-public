// app/api/payments/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Body = {
  date?: string;
  amount?: number | null;
  medium?: string;
  note?: string | null;
};

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  try {
    const id = await ctx.params.id;
    const body = (await req.json()) as Body;

    const supabase = await createClient();

    const update: Body & { created_at: string } = {
      date: body.date,
      amount: body.amount ?? null,
      medium: body.medium,
      note: body.note ?? null,
      created_at: new Date().toISOString(),
    };

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

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  try {
    const id = ctx.params.id;
    const supabase = await createClient();

    const { error } = await supabase.from("payment_entries").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete payment";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
