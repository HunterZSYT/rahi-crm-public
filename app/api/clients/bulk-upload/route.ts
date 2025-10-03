// app/api/clients/bulk-upload/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type TabKey = "clients" | "work" | "payments";

type Body = {
  type: TabKey;
  createMissingClients?: boolean;
  rows: Record<string, any>[];
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function num(v: any) {
  const n = Number(String(v ?? "").toString().replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}
function normBasis(s: string | null) {
  const v = String(s ?? "").toLowerCase();
  return (["second", "minute", "hour", "project"] as const).includes(v as any)
    ? (v as "second" | "minute" | "hour" | "project")
    : "minute";
}
function normClientStatus(s: string | null) {
  const v = String(s ?? "").toLowerCase();
  return (["active", "closed", "payment_expired"] as const).includes(v as any)
    ? (v as "active" | "closed" | "payment_expired")
    : "active";
}
function normWorkStatus(s: string | null) {
  const v = String(s ?? "").toLowerCase();
  return v === "processing" ? "processing" : "delivered";
}
function normPricingMode(s: string | null) {
  const v = String(s ?? "").toLowerCase();
  return (["auto", "manual_rate", "manual_total"] as const).includes(v as any)
    ? (v as "auto" | "manual_rate" | "manual_total")
    : null;
}
function normMedium(s: string | null) {
  const v = String(s ?? "").trim().toLowerCase();
  const cleaned = v.replace(/[\s_-]/g, "");
  if (cleaned.startsWith("bkash")) return "bkash";
  if (cleaned.startsWith("nagad")) return "nagad";
  if (cleaned.startsWith("bank")) return "bank";
  if (cleaned === "cash") return "cash";
  return "other";
}
function asDateOnly(v: any): string | null {
  const raw = cleanStr(v);
  if (!raw) return null;
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const supabase = await createClient();

  if (!body || !body.type || !Array.isArray(body.rows)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = {
    type: body.type,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [] as string[],
  };

  async function getClientIdByName(
    name: string,
    defaults?: { charged_by?: string; rate?: number; status?: string; created_at?: string | null }
  ) {
    const { data: found, error: findErr } = await supabase
      .from("clients")
      .select("id")
      .eq("name", name)
      .limit(1);

    if (findErr) throw new Error(findErr.message);
    if (found && found.length) return found[0].id as string;

    const payload: any = {
      name,
      charged_by: normBasis(defaults?.charged_by ?? "minute"),
      rate: num(defaults?.rate ?? 0),
      status: normClientStatus(defaults?.status ?? "active"),
    };
    const created_at = asDateOnly(defaults?.created_at ?? null);
    if (created_at) payload.created_at = created_at;

    const { data: created, error: insErr } = await supabase
      .from("clients")
      .insert(payload)
      .select("id")
      .single();

    if (insErr) throw new Error(insErr.message);
    return created!.id as string;
  }

  try {
    /* ------------------------------- Clients ------------------------------- */
    if (body.type === "clients") {
      for (const r of body.rows) {
        const name = cleanStr(r.name);
        if (!name) {
          result.skipped++;
          result.errors.push("Client row skipped (missing name)");
          continue;
        }

        const patch: Record<string, any> = {
          name,
          charged_by: normBasis(r.charged_by ?? "minute"),
          rate: num(r.rate ?? 0),
          status: normClientStatus(r.status ?? "active"),
          contact_name: cleanStr(r.contact_name),
          designation: cleanStr(r.designation),
          email: cleanStr(r.email),
          phone: cleanStr(r.phone),
          note: cleanStr(r.note),
        };

        const created_at = asDateOnly(r.created_at);
        if (created_at) patch.created_at = created_at;

        const { data: existing, error: findErr } = await supabase
          .from("clients")
          .select("id")
          .eq("name", name)
          .limit(1);

        if (findErr) throw new Error(findErr.message);

        if (existing && existing.length) {
          const { error: upErr } = await supabase
            .from("clients")
            .update(patch)
            .eq("id", existing[0].id);
          if (upErr) throw new Error(upErr.message);
          result.updated++;
        } else {
          const { error: insErr } = await supabase.from("clients").insert(patch);
          if (insErr) throw new Error(insErr.message);
          result.inserted++;
        }
      }
    }

    /* ------------------------------- Payments ------------------------------ */
    if (body.type === "payments") {
      for (const r of body.rows) {
        const clientName = cleanStr(r.client_name);
        const amount = num(r.amount);
        if (!clientName || !amount) {
          result.skipped++;
          result.errors.push("Payment row skipped (needs client_name and amount)");
          continue;
        }
        let client_id: string | null = null;

        const { data: found } = await supabase
          .from("clients")
          .select("id")
          .eq("name", clientName)
          .limit(1);
        if (found && found.length) {
          client_id = found[0].id;
        } else if (body.createMissingClients) {
          client_id = await getClientIdByName(clientName);
        } else {
          result.skipped++;
          result.errors.push(`Payment skipped (client "${clientName}" missing)`);
          continue;
        }

        const date = asDateOnly(r.date) ?? todayISO();
        const medium = normMedium(r.medium);
        const note = cleanStr(r.note);

        const { error: insErr } = await supabase.from("payment_entries").insert({
          client_id,
          amount,
          date,
          medium,
          note,
        });

        if (insErr) {
          result.skipped++;
          result.errors.push(insErr.message);
          continue;
        }
        result.inserted++;
      }
    }

    /* -------------------------------- Work --------------------------------- */
    if (body.type === "work") {
      for (const r of body.rows) {
        const clientName = cleanStr(r.client_name);
        const workName = cleanStr(r.work_name);
        const baseRate = num(r.rate);
        if (!clientName || !workName) {
          result.skipped++;
          result.errors.push("Work row skipped (needs client_name and work_name)");
          continue;
        }

        let client_id: string | null = null;
        const { data: found } = await supabase
          .from("clients")
          .select("id")
          .eq("name", clientName)
          .limit(1);

        if (found && found.length) {
          client_id = found[0].id;
        } else if (body.createMissingClients) {
          client_id = await getClientIdByName(clientName, {
            charged_by: r.basis,
            rate: baseRate,
            status: "active",
            created_at: asDateOnly(r.client_created_at ?? null) ?? undefined,
          });
        } else {
          result.skipped++;
          result.errors.push(`Work skipped (client "${clientName}" missing)`);
          continue;
        }

        const basis = normBasis(r.basis ?? "minute");

        // Pricing mode:
        const explicitMode = normPricingMode(r.pricing_mode);
        const manualTotal = num(r.amount);
        const manualRate = num(r.manual_rate);
        const pricing_mode: "auto" | "manual_rate" | "manual_total" =
          explicitMode ?? (manualTotal > 0 ? "manual_total" : "auto");

        const date = asDateOnly(r.date) ?? todayISO();
        const status = normWorkStatus(
          r.status ?? (r.delivered_at ? "delivered" : "processing")
        );
        const delivered_at =
          status === "delivered" ? asDateOnly(r.delivered_at) ?? date : null;
        const note = cleanStr(r.note);

        // 🔴 NEW: accept multiple possible column names for the variant label
        const variant_label =
          cleanStr(r.work_variant ?? r.variant ?? r.variant_label) ?? null;

        // Duration / units
        let duration_seconds: number | null = null;
        let units: number | null = null;

        if (basis === "project") {
          const u = num(r.units);
          units = Math.max(1, u || 1);
          duration_seconds = null;
        } else {
          const ds = num(r.duration_seconds);
          let seconds = ds;
          if (!seconds) {
            const m = num(r.minutes);
            const s = num(r.seconds);
            seconds = basis === "second" ? (s || m) : m * 60 + s;
          }
          if (!seconds && pricing_mode !== "manual_total") {
            result.skipped++;
            result.errors.push(
              `Work skipped (${clientName} / "${workName}") – duration_seconds required for time-based pricing`
            );
            continue;
          }
          duration_seconds = seconds || 0;
          if (basis === "second") units = duration_seconds;
          else if (basis === "minute") units = duration_seconds / 60;
          else units = duration_seconds / 3600;
        }

        // Price snapshots
        let rate_snapshot: number | null = null;
        let amount_due: number | null = null;

        if (pricing_mode === "manual_total") {
          rate_snapshot = null;
          amount_due = manualTotal;
        } else if (pricing_mode === "manual_rate") {
          rate_snapshot = manualRate;
          const u = basis === "project" ? (units ?? 1) : (units ?? 0);
          amount_due = Math.max(0, u * rate_snapshot);
        } else {
          rate_snapshot = baseRate;
          const u = basis === "project" ? (units ?? 1) : (units ?? 0);
          amount_due = Math.max(0, u * rate_snapshot);
        }

        const patch: Record<string, any> = {
          client_id,
          date,
          project_name: workName,
          status,
          pricing_mode,
          charged_by_snapshot: basis,
          rate_snapshot,
          duration_seconds: basis === "project" ? null : duration_seconds,
          units,
          amount_due,
          note,
          delivered_at,
          variant_label, // ✅ will store your "work_variant" value
        };

        const { error: insErr } = await supabase.from("work_entries").insert(patch);
        if (insErr) {
          result.skipped++;
          result.errors.push(insErr.message);
          continue;
        }
        result.inserted++;
      }
    }

    const status = result.errors.length ? 207 : 200;
    return NextResponse.json(result, { status });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Bulk upload failed" },
      { status: 500 }
    );
  }
}
