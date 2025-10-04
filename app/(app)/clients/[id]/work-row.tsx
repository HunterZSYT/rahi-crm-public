"use client";

import AddWork, { type WorkInitial } from "./add-work";
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
  variantLabel,      // optional label coming from server
  showVariantColumn, // whether to render Variant column
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

  // ✅ include variant_label so the Edit Work modal pre-fills that field
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
    variant_label: (variantLabel ?? "").trim() || null,
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
        <tr className="border-t border-neutral-200 cursor-pointer transition-colors hover:bg-neutral-50 [&>td]:align-middle dark:border-neutral-800 dark:hover:bg-neutral-800/60">
          {/* Date */}
          <td className="w-[140px] shrink-0 whitespace-nowrap px-4 py-2">
            {formatDateLong(row.date)}
          </td>

          {/* Project */}
          <td className="min-w-0 px-4 py-2">
            <span className="block truncate" title={row.project_name}>
              {row.project_name || "—"}
            </span>
          </td>

          {/* Variant (optional column) */}
          {showVariantColumn ? (
            <td className="w-[160px] shrink-0 whitespace-nowrap px-4 py-2">
              {variantLabel ? (
                <span
                  className="rounded-full border border-neutral-200 bg-neutral-100 px-2 py-[2px] text-[11px] text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-200"
                  title={variantLabel}
                >
                  {variantLabel}
                </span>
              ) : (
                "—"
              )}
            </td>
          ) : null}

          {/* Duration / Units */}
          <td className="w-[120px] shrink-0 whitespace-nowrap px-4 py-2">
            {qty}
          </td>

          {/* Due */}
          <td className="w-[96px] shrink-0 px-4 py-2 text-right tabular-nums">
            {row.amount_due != null ? formatMoney(row.amount_due) : "—"}
          </td>

          {/* Billing summary pill */}
          <td className="min-w-[200px] max-w-[280px] px-4 py-2">
            <span
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-neutral-200 px-2 py-0.5 text-[11px] leading-none text-neutral-700 dark:border-neutral-700 dark:text-neutral-200"
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
                <span className="shrink-0 rounded bg-amber-100 px-1.5 py-[1px] text-[10px] font-medium text-amber-900 dark:bg-amber-900/30 dark:text-amber-300">
                  override
                </span>
              )}
            </span>
          </td>

          {/* Status (prevent bubbling) */}
          <td className="w-[116px] shrink-0 px-4 py-2">
            <div onClick={stop}>
              <StatusToggle
                clientId={clientId}
                id={row.id}
                deliveredAt={row.delivered_at}
              />
            </div>
          </td>

          {/* Note */}
          <td className="min-w-0 px-4 py-2">
            <span
              className="block truncate text-neutral-700 dark:text-neutral-300"
              title={row.note ?? ""}
            >
              {row.note ?? "—"}
            </span>
          </td>
        </tr>
      }
    />
  );
}
