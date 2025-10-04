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

  // columns
  const baseCols =
    "id,date,project_name,status,pricing_mode,charged_by_snapshot,rate_snapshot,duration_seconds,units,amount_due,override_reason,delivered_at,note";
  const colsWithVariant = `${baseCols},variant_label`;

  // Build the work query with filters applied
  const buildWorkQuery = (cols: string) => {
    let q = supabase.from("work_entries").select(cols).eq("client_id", clientId);
    if (filters.status !== "all") q = q.eq("status", filters.status);
    if (filters.basis !== "all") q = q.eq("charged_by_snapshot", filters.basis);
    if (filters.mode !== "all") q = q.eq("pricing_mode", filters.mode);
    return q.order("date", { ascending: false });
  };

  // Fetch rows (try with variant_label), and the client's basis/rate in parallel
  const [rowsTry, clientMeta] = await Promise.all([
    buildWorkQuery(colsWithVariant),
    supabase
      .from("clients")
      .select("charged_by,rate")
      .eq("id", clientId)
      .maybeSingle<{ charged_by: "second" | "minute" | "hour" | "project"; rate: number }>(),
  ]);

  let data = rowsTry.data as WorkRowWithVariant[] | null;
  let error = rowsTry.error;

  // If variant_label doesn't exist in schema, retry without it.
  if (error && /variant_label/i.test(error.message || "")) {
    const retry = await buildWorkQuery(baseCols);
    data = retry.data as any;
    error = retry.error as any;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
        {error.message}
      </div>
    );
  }

  const rows = (data ?? []) as WorkRowWithVariant[];
  const defaultBasis = clientMeta.data?.charged_by ?? "minute";
  const defaultRate = Number(clientMeta.data?.rate ?? 0);

  return (
    <WorkTableClient
      rows={rows}
      clientId={clientId}
      right={right}
      defaultBasis={defaultBasis}
      defaultRate={defaultRate}
    />
  );
}
