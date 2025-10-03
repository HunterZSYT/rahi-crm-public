import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoice_settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(req: Request) {
  const body = await req.json();
  const supabase = await createClient();
  const patch: any = {
    from_text: body.from_text,
    payment_text: body.payment_text,
    logo_url: body.logo_url ?? null,
    currency: body.currency ?? "BDT",
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("invoice_settings")
    .update(patch)
    .eq("id", 1)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
