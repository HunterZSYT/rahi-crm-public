import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ChargedBy = "second" | "minute" | "hour" | "project";

function dateOnlyToISO(d?: string | null) {
  if (!d) return undefined;
  return new Date(`${d}T00:00:00`).toISOString();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const payload = {
      name: String(body.name ?? "").trim(),
      charged_by: (body.charged_by as ChargedBy) || "minute",
      rate: Number(body.rate ?? 0),
      contact_name: (body.contact_name ?? null) || null,
      designation: (body.designation ?? null) || null,
      email: (body.email ?? null) || null,
      phone: (body.phone ?? null) || null,
      note: (body.note ?? null) || null,
      // NEW: allow overriding created_at from a date input
      created_at: body.created_at ? dateOnlyToISO(body.created_at) : undefined,
    };

    if (!payload.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("clients")
      .insert(payload)
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, id: data!.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create client";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
