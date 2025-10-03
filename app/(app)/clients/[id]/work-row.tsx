"use client";

import AddWork, { WorkInitial } from "./add-work";
import { formatDateLong, formatDuration, formatMoney } from "@/lib/format";
import StatusToggle from "./status-toggle";
import { MouseEvent } from "react";

type Basis = "second" | "minute" | "hour" | "project";
type PricingMode = "auto" | "manual_rate" | "manual_total";

export type WorkRowUI = {
  id: string;
  date: string;
  project_name: string;
  status: "processing" | "delivered";
  pricing_mode: PricingMode;
  charged_by_snapshot: Basis | null;
  rate_snapshot: number | null;
  duration_seconds: number | null;
  units: number | null;
  amount_due: number | null;
  override_reason: string | null;
  delivered_at: string | null;
  note: string | null;
};

export default function WorkRow({
  row,
  clientId,
  defaultBasis,
  defaultRate,
  variantLabel,           // NEW
  showVariantColumn,      // NEW
}: {
  row: WorkRowUI;
  clientId: string;
  defaultBasis: Basis;
  defaultRate: number;
  variantLabel?: string;
  showVariantColumn?: boolean;
}) {
  const qty =
    row.charged_by_snapshot === "project"
      ? `${row.units ?? 1} project`
      : row.duration_seconds != null
      ? formatDuration(row.duration_seconds)
      : row.units != null
      ? `${row.units}`
      : "—";

  const billingLabel =
    row.pricing_mode === "manual_total"
      ? `${formatMoney(row.amount_due ?? 0)}`
      : `per ${row.charged_by_snapshot ?? "—"} • ${formatMoney(
          row.rate_snapshot ?? 0
        )} ${row.pricing_mode === "manual_rate" ? "(Manual rate)" : "(Auto)"}`;

  const initial: WorkInitial = {
    id: row.id,
    date: row.date,
    project_name: row.project_name,
    charged_by_snapshot: row.charged_by_snapshot,
    pricing_mode: row.pricing_mode,
    duration_seconds: row.duration_seconds,
    units: row.units,
    rate_snapshot: row.rate_snapshot,
    amount_due: row.amount_due,
    override_reason: row.override_reason,
    delivered_at: row.delivered_at,
    note: row.note,
  };

  function stop(e: MouseEvent) {
    e.stopPropagation();
  }

  return (
    <AddWork
      clientId={clientId}
      defaultBasis={defaultBasis}
      defaultRate={defaultRate}
      initial={initial}
      trigger={
        <tr className="border-t cursor-pointer hover:bg-neutral-50 [&>td]:align-middle">
          {/* Date */}
          <td className="px-4 py-2 w-[140px] shrink-0 whitespace-nowrap">
            {formatDateLong(row.date)}
          </td>

          {/* Project */}
          <td className="px-4 py-2 min-w-0">
            <span className="block truncate" title={row.project_name}>
              {row.project_name || "—"}
            </span>
          </td>

          {/* Variant (dedicated column) */}
          {showVariantColumn ? (
            <td className="px-4 py-2 w-[160px] shrink-0 whitespace-nowrap">
              {variantLabel ? (
                <span className="rounded-full bg-neutral-100 px-2 py-[2px] text-[11px] text-neutral-700">
                  {variantLabel}
                </span>
              ) : (
                "—"
              )}
            </td>
          ) : null}

          {/* Duration */}
          <td className="px-4 py-2 w-[120px] shrink-0 whitespace-nowrap">{qty}</td>

          {/* Due */}
          <td className="px-4 py-2 w-[96px] shrink-0 text-right tabular-nums">
            {row.amount_due != null ? formatMoney(row.amount_due) : "—"}
          </td>

          {/* Billing */}
          <td className="px-4 py-2 min-w-[200px] max-w-[280px]">
            <span
              className="inline-flex max-w-full items-center gap-2 rounded-full border px-2 py-0.5 text-[11px] leading-none whitespace-nowrap"
              title={
                row.pricing_mode === "manual_total"
                  ? `Manual total • ${formatMoney(row.amount_due ?? 0)}`
                  : `Captured at delivery • Basis: ${
                      row.charged_by_snapshot ?? "—"
                    } • Rate: ${formatMoney(row.rate_snapshot ?? 0)} • Mode: ${
                      row.pricing_mode === "manual_rate" ? "Manual rate" : "Auto"
                    }`
              }
            >
              <span className="truncate">{billingLabel}</span>
              {row.pricing_mode !== "auto" && (
                <span className="shrink-0 rounded bg-yellow-100 px-1.5 py-[1px] text-[10px] font-medium text-yellow-900">
                  override
                </span>
              )}
            </span>
          </td>

          {/* Status (don’t bubble) */}
          <td className="px-4 py-2 w-[116px] shrink-0">
            <div onClick={stop}>
              <StatusToggle clientId={clientId} id={row.id} deliveredAt={row.delivered_at} />
            </div>
          </td>

          {/* Note */}
          <td className="px-4 py-2 min-w-0">
            <span className="block truncate" title={row.note ?? ""}>
              {row.note ?? "—"}
            </span>
          </td>
        </tr>
      }
    />
  );
}
