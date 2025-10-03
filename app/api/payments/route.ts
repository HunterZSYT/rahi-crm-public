import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Body = {
  clientId: string;
  date: string;        // "YYYY-MM-DD"
  amount: number;
  medium: string;      // e.g. "bkash" | "nagad" | "rocket" | "bank" | "other"
  note?: string | null;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    // Basic validation
    if (!body.clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });
    if (!body.date)     return NextResponse.json({ error: "date required" }, { status: 400 });
    if (!(body.amount > 0)) return NextResponse.json({ error: "amount must be > 0" }, { status: 400 });
    if (!body.medium)   return NextResponse.json({ error: "medium required" }, { status: 400 });

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("payment_entries")
      .insert({
        client_id: body.clientId,
        date: body.date,
        amount: body.amount,
        medium: body.medium,
        note: body.note ?? null,
      })
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, id: data!.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
