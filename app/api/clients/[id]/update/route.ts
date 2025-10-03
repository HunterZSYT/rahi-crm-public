import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ChargedBy = "second" | "minute" | "hour" | "project";
type Status = "active" | "closed" | "payment_expired";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const supabase = await createClient();

  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // optional/validated fields
  const charged_by: ChargedBy | undefined =
    ["second", "minute", "hour", "project"].includes(body.charged_by)
      ? (body.charged_by as ChargedBy)
      : undefined;

  const status: Status | undefined =
    ["active", "closed", "payment_expired"].includes(body.status)
      ? (body.status as Status)
      : undefined;

  const rate =
    body.rate == null || Number.isNaN(Number(body.rate))
      ? undefined
      : Number(body.rate);

  const patch: Record<string, any> = {
    name,
    contact_name: body.contact_name ?? null,
    designation: body.designation ?? null,
    email: body.email ?? null,
    phone: body.phone ?? null,
    note: body.note ?? null,
  };

  if (charged_by) patch.charged_by = charged_by;
  if (status) patch.status = status; // ← NEW
  if (typeof rate === "number") patch.rate = rate;

  // allow changing created_at from a date input (YYYY-MM-DD)
  if (body.created_at) {
    // set to start of day in UTC
    const iso = new Date(`${body.created_at}T00:00:00.000Z`).toISOString();
    patch.created_at = iso;
  }

  const { error } = await supabase.from("clients").update(patch).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
