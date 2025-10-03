// app/(app)/clients/[id]/work-table.tsx
import { createClient } from "@/lib/supabase/server";
import { WorkFiltersState } from "./work-filters";
import WorkTableClient from "./work-table.client";
import type { WorkRowUI } from "./work-row";

/** extend row to optionally include variant_label */
export type WorkRowWithVariant = WorkRowUI & {
  variant_label?: string | null;
};

export default async function WorkTable({
  clientId,
  filters,
  right, // optional toolbar slot (e.g., Add entry button, filters chip, etc.)
}: {
  clientId: string;
  filters: WorkFiltersState;
  right?: React.ReactNode;
}) {
  const supabase = await createClient();

  // try selecting variant_label; if column doesn't exist, fall back gracefully
  const baseCols =
    "id,date,project_name,status,pricing_mode,charged_by_snapshot,rate_snapshot,duration_seconds,units,amount_due,override_reason,delivered_at,note";
  const colsWithVariant = `${baseCols},variant_label`;

  let query = supabase
    .from("work_entries")
    .select(colsWithVariant)
    .eq("client_id", clientId);

  // server-side filters you already have
  if (filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.basis !== "all")
    query = query.eq("charged_by_snapshot", filters.basis);
  if (filters.mode !== "all") query = query.eq("pricing_mode", filters.mode);

  let { data, error } = await query.order("date", { ascending: false });

  // If variant_label doesn't exist in schema, retry without it.
  if (error && /variant_label/i.test(error.message || "")) {
    let q2 = supabase
      .from("work_entries")
      .select(baseCols)
      .eq("client_id", clientId);

    if (filters.status !== "all") q2 = q2.eq("status", filters.status);
    if (filters.basis !== "all")
      q2 = q2.eq("charged_by_snapshot", filters.basis);
    if (filters.mode !== "all") q2 = q2.eq("pricing_mode", filters.mode);

    const retry = await q2.order("date", { ascending: false });
    data = retry.data as any;
    error = retry.error as any;
  }

  if (error) {
    return <div className="text-red-700">{error.message}</div>;
  }

  const rows = (data ?? []) as WorkRowWithVariant[];
  return (
    <WorkTableClient
      rows={rows}
      clientId={clientId}
      right={right}
      defaultBasis="minute"
      defaultRate={0}
    />
  );
}
