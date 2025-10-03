"use client";

import * as React from "react";
import WorkRow, { type WorkRowUI } from "./work-row";

/** Server may include variant_label for each row */
type RowWithVariant = WorkRowUI & {
  variant_label?: string | null;
};

export default function WorkTableClient({
  rows,
  clientId,
  right,
  defaultBasis,
  defaultRate,
}: {
  rows: RowWithVariant[];
  clientId: string;
  right?: React.ReactNode;
  defaultBasis: "second" | "minute" | "hour" | "project";
  defaultRate: number;
}) {
  const variants = React.useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const v = (r.variant_label ?? "").trim();
      if (v) set.add(v);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const hasVariants = variants.length > 0;
  const [active, setActive] = React.useState<string>("__all");

  const filtered = React.useMemo(() => {
    if (active === "__all") return rows;
    return rows.filter((r) => (r.variant_label ?? "").trim() === active);
  }, [rows, active]);

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="inline-flex w-fit items-center gap-2 rounded-xl border bg-white/70 px-3 py-2 text-sm text-neutral-700">
          <span>{filtered.length} total</span>
        </div>
        {right ? <div className="flex items-center gap-2">{right}</div> : null}
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActive("__all")}
          className={[
            "rounded-full border px-3 py-1 text-sm",
            active === "__all" ? "bg-black text-white" : "bg-white",
          ].join(" ")}
        >
          All
        </button>
        {variants.map((v) => (
          <button
            key={v}
            onClick={() => setActive(v)}
            className={[
              "rounded-full border px-3 py-1 text-sm",
              active === v ? "bg-black text-white" : "bg-white",
            ].join(" ")}
            title={v}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1140px] table-fixed text-sm">
          <colgroup>
            <col className="w-[160px]" />
            <col className="w-[240px]" />
            {hasVariants ? <col className="w-[160px]" /> : null}
            <col className="w-[160px]" />
            <col className="w-[120px]" />
            <col className="w-[180px]" />
            <col className="w-[120px]" />
            <col />
          </colgroup>

          <thead className="sticky top-0 z-10 bg-neutral-50 text-neutral-800">
            <tr className="text-left">
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Project</th>
              {hasVariants ? <th className="px-4 py-2">Variant</th> : null}
              <th className="px-4 py-2">Duration/Units</th>
              <th className="px-4 py-2 text-right">Due</th>
              <th className="px-4 py-2">Billing</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Note</th>
            </tr>
          </thead>

          <tbody className="text-neutral-900">
            {filtered.map((r) => (
              <WorkRow
                key={r.id}
                row={r}
                clientId={clientId}
                defaultBasis={defaultBasis}
                defaultRate={defaultRate}
                variantLabel={(r.variant_label ?? "").trim() || undefined}
                showVariantColumn={hasVariants}
              />
            ))}

            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={hasVariants ? 8 : 7}
                  className="px-4 py-6 text-center text-neutral-500"
                >
                  No entries in this tab.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
