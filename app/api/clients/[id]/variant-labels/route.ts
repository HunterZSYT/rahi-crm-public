// app/api/clients/[id]/variant-labels/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseService } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TABLE = "work_entries";
const CLIENT_ID_COL = "client_id";

type Row = { variant_label: string | null };

function normalize(rows: Row[]): string[] {
  const set = new Set<string>();
  for (const r of rows || []) {
    const label = (r.variant_label ?? "").trim();
    if (label) set.add(label);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

async function getWithServiceKey(clientId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const svc = createSupabaseService(url, key, { auth: { persistSession: false } });

  const { data, error } = await svc
    .from<Row>(TABLE)
    .select("variant_label")
    .eq(CLIENT_ID_COL, clientId)
    .not("variant_label", "is", null);

  if (error) {
    console.warn("[variant-labels] service key error:", error.message);
    return [];
  }
  return normalize(data ?? []);
}

async function getWithSession(clientId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from<Row>(TABLE)
    .select("variant_label")
    .eq(CLIENT_ID_COL, clientId)
    .not("variant_label", "is", null);

  if (error) {
    console.warn("[variant-labels] session error:", error.message);
    return [];
  }
  return normalize(data ?? []);
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> } // <-- params is a Promise in Next 15
) {
  try {
    const { id } = await ctx.params; // <-- must await
    if (!id) {
      return NextResponse.json(
        { labels: [] },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }

    const hasServiceKey =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !!process.env.SUPABASE_SERVICE_ROLE_KEY;

    const labels = hasServiceKey
      ? await getWithServiceKey(id)
      : await getWithSession(id);

    return NextResponse.json(
      { labels },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("[variant-labels] unexpected:", e);
    // stay resilient — return empty list instead of failing the UI
    return NextResponse.json(
      { labels: [] },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}
