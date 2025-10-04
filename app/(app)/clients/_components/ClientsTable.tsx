"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import SortableHeader from "./SortableHeader";
import HeaderMultiSelect from "./HeaderMultiSelect";
import DateHeaderRange from "./DateHeaderRange";
import { AnimatePresence, motion } from "framer-motion";

/** ---------------- Types ---------------- */
export type Row = {
  client: {
    id: string;
    name: string;
    charged_by: "second" | "minute" | "hour" | "project";
    status: "active" | "closed" | "payment_expired";
    created_at?: string | null;
    /** NEW: used for mobile subline */
    rate?: number | null;
  };
  projects: number;
  payments: number; // DISPLAY as “Earnings”
  dues: number;
  activeDays: number;
  lastDate: string | null;
};

type Props = {
  rows: Row[];
  selectedCharged: Array<Row["client"]["charged_by"]>;
  selectedStatus: Array<Row["client"]["status"]>;
  from: string | null;
  to: string | null;
  sortKey: string;
  sortDir: "asc" | "desc";
  bulk: boolean;
};

/** ---------------- Helpers ---------------- */
function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}
function money(n: number) {
  return `৳${Number(n || 0).toLocaleString("en-BD", {
    maximumFractionDigits: 2,
  })}`;
}
const shortDate = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(iso))
    : "—";

function cmp(a: any, b: any) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "string" && typeof b === "string") return a.localeCompare(b);
  return a < b ? -1 : a > b ? 1 : 0;
}

const statusClass: Record<Row["client"]["status"], string> = {
  active:
    "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900/40",
  closed:
    "bg-slate-50 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:ring-slate-800/40",
  payment_expired:
    "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-900/40",
};
const chargedClass: Record<Row["client"]["charged_by"], string> = {
  second:
    "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:ring-indigo-900/40",
  minute:
    "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-900/40",
  hour:
    "bg-purple-50 text-purple-700 ring-1 ring-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:ring-purple-900/40",
  project:
    "bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-200 dark:bg-fuchsia-950/30 dark:text-fuchsia-300 dark:ring-fuchsia-900/40",
};

const unitLabel: Record<Row["client"]["charged_by"], string> = {
  second: "sec",
  minute: "min",
  hour: "hr",
  project: "project",
};

/** ---------------- Component ---------------- */
export default function ClientsTable({
  rows,
  selectedCharged,
  selectedStatus,
  from,
  to,
  sortKey,
  sortDir,
  bulk,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const [sort, setSort] = React.useState<{ key: string; dir: "asc" | "desc" }>(
    { key: sortKey || "", dir: sortDir || "desc" }
  );

  // Bulk selection
  const [checked, setChecked] = React.useState<Record<string, boolean>>({});
  const allIds = React.useMemo(() => rows.map((r) => r.client.id), [rows]);
  const allSelected = allIds.length > 0 && allIds.every((id) => checked[id]);
  function toggleAll() {
    if (allSelected) setChecked({});
    else {
      const next: Record<string, boolean> = {};
      for (const id of allIds) next[id] = true;
      setChecked(next);
    }
  }

  // filter (charged_by, status, from/to)
  let view = rows.filter((r) => {
    const effectiveDate = r.lastDate ?? r.client.created_at ?? null;
    if (
      selectedCharged.length > 0 &&
      !selectedCharged.includes(r.client.charged_by)
    ) {
      return false;
    }
    if (selectedStatus.length > 0 && !selectedStatus.includes(r.client.status)) {
      return false;
    }
    if (from && effectiveDate && effectiveDate < from) return false;
    if (to && effectiveDate && effectiveDate > to) return false;
    return true;
  });

  // sort
  if (sort.key) {
    view = [...view].sort((a, b) => {
      let av: any;
      let bv: any;
      switch (sort.key) {
        case "date": {
          const ad = a.lastDate ?? a.client.created_at ?? "";
          const bd = b.lastDate ?? b.client.created_at ?? "";
          av = ad;
          bv = bd;
          break;
        }
        case "client":
          av = a.client.name;
          bv = b.client.name;
          break;
        case "charged_by":
          av = a.client.charged_by;
          bv = b.client.charged_by;
          break;
        case "projects":
          av = a.projects;
          bv = b.projects;
          break;
        case "payments":
          av = a.payments;
          bv = b.payments;
          break;
        case "dues":
          av = a.dues;
          bv = b.dues;
          break;
        case "status":
          av = a.client.status;
          bv = b.client.status;
          break;
        case "activeDays":
          av = a.activeDays;
          bv = b.activeDays;
          break;
        default:
          av = 0;
          bv = 0;
      }
      const res = cmp(av, bv);
      return sort.dir === "asc" ? res : -res;
    });
  }
  function setSortKey(key: string) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  }

  // master clear filters
  const hasFilters =
    (from && from.length > 0) ||
    (to && to.length > 0) ||
    selectedCharged.length > 0 ||
    selectedStatus.length > 0;
  function clearFilters() {
    const params = new URLSearchParams(search);
    ["from", "to", "charged", "status"].forEach((k) => params.delete(k));
    router.push(`${pathname}?${params.toString()}`);
  }

  // chips
  const filterChips: Array<{ label: string; value: string }> = [];
  if (from || to) {
    const d = `${from ? shortDate(from) : "—"} → ${to ? shortDate(to) : "—"}`;
    filterChips.push({ label: "Date", value: d });
  }
  if (selectedCharged.length) {
    filterChips.push({
      label: "Charged",
      value: selectedCharged
        .map((s) => s[0].toUpperCase() + s.slice(1))
        .join(", "),
    });
  }
  if (selectedStatus.length) {
    filterChips.push({
      label: "Status",
      value: selectedStatus
        .map((s) => s.replace("_", " "))
        .map((s) => s[0].toUpperCase() + s.slice(1))
        .join(", "),
    });
  }

  return (
    <div className="relative overflow-x-auto overflow-y-visible">
      {/* gradient masks */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-gradient-to-b from-white/70 dark:from-black/20 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2 bg-gradient-to-t from-white/70 dark:from-black/20 to-transparent" />

      {/* Filters indicator bar */}
      {hasFilters && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900/70">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Filters active
            </span>
            {filterChips.map((c) => (
              <span
                key={c.label}
                className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-0.5 text-xs dark:border-neutral-800 dark:bg-neutral-900"
                title={`${c.label}: ${c.value}`}
              >
                <span className="text-neutral-500 dark:text-neutral-400">
                  {c.label}:
                </span>
                <span className="font-medium dark:text-neutral-100">
                  {c.value}
                </span>
              </span>
            ))}
          </div>
          <button
            onClick={clearFilters}
            className="rounded-lg border border-neutral-200 px-2 py-1 text-xs font-medium hover:bg-white dark:border-neutral-700 dark:hover:bg-neutral-900"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* min height so a single row doesn’t look “squeezed” */}
      <div className="min-h-[420px] sm:min-h-[550px]">
        <table className="w-full border-collapse text-[13px] sm:text-[13.5px] [--row-pad:0.70rem] table-auto">
          {/* sticky header */}
          <thead className="sticky top-0 z-10 bg-neutral-50/90 backdrop-blur supports-[backdrop-filter]:bg-neutral-50/70 shadow-[inset_0_-1px_0_rgba(0,0,0,.06)] dark:bg-neutral-900/85 dark:supports-[backdrop-filter]:bg-neutral-900/70 dark:shadow-[inset_0_-1px_0_rgba(255,255,255,.06)]">
            <tr>
              {bulk && (
                <th className="w-[36px] px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                </th>
              )}

              {/* Date */}
              <th className="px-3 py-2 text-left">
                <div className="flex items-center gap-2">
                  <SortableHeader
                    label=""
                    active={sort.key === "date"}
                    dir={sort.dir}
                    onToggle={() => setSortKey("date")}
                  />
                  <DateHeaderRange from={from ?? undefined} to={to ?? undefined} />
                </div>
              </th>

              {/* Client */}
              <th className="px-3 py-2 text-left min-w-[160px]">
                <SortableHeader
                  label="Client"
                  active={sort.key === "client"}
                  dir={sort.dir}
                  onToggle={() => setSortKey("client")}
                />
              </th>

              {/* Charged By (hide < md) */}
              <th className="px-3 py-2 text-left hidden md:table-cell">
                <div className="flex items-center gap-2">
                  <SortableHeader
                    label="Charged By"
                    active={sort.key === "charged_by"}
                    dir={sort.dir}
                    onToggle={() => setSortKey("charged_by")}
                  />
                  <HeaderMultiSelect
                    label=""
                    param="charged"
                    selected={selectedCharged}
                    options={[
                      { value: "second", label: "Second" },
                      { value: "minute", label: "Minute" },
                      { value: "hour", label: "Hour" },
                      { value: "project", label: "Project" },
                    ]}
                  />
                </div>
              </th>

              {/* Total Projects (hide < md) */}
              <th className="px-3 py-2 text-right hidden md:table-cell">
                <SortableHeader
                  label="Total Projects"
                  active={sort.key === "projects"}
                  dir={sort.dir}
                  onToggle={() => setSortKey("projects")}
                />
              </th>

              {/* Earnings */}
              <th className="px-3 py-2 text-right">
                <SortableHeader
                  label="Earnings"
                  active={sort.key === "payments"}
                  dir={sort.dir}
                  onToggle={() => setSortKey("payments")}
                />
              </th>

              {/* Dues */}
              <th className="px-3 py-2 text-right">
                <SortableHeader
                  label="Dues"
                  active={sort.key === "dues"}
                  dir={sort.dir}
                  onToggle={() => setSortKey("dues")}
                />
              </th>

              {/* Status (hide < lg) */}
              <th className="px-3 py-2 text-left hidden lg:table-cell">
                <div className="flex items-center gap-2">
                  <SortableHeader
                    label="Status"
                    active={sort.key === "status"}
                    dir={sort.dir}
                    onToggle={() => setSortKey("status")}
                  />
                  <HeaderMultiSelect
                    label=""
                    param="status"
                    selected={selectedStatus}
                    options={[
                      { value: "active", label: "Active" },
                      { value: "closed", label: "Closed" },
                      { value: "payment_expired", label: "Payment expired" },
                    ]}
                  />
                </div>
              </th>

              {/* Active Days (hide < xl) */}
              <th className="px-3 py-2 text-right hidden xl:table-cell">
                <SortableHeader
                  label="Active Days"
                  active={sort.key === "activeDays"}
                  dir={sort.dir}
                  onToggle={() => setSortKey("activeDays")}
                />
              </th>

              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>

          <motion.tbody layout transition={{ duration: 0.18 }}>
            {view.length === 0 ? (
              <tr>
                <td
                  className="px-3 py-16 text-center text-neutral-500 dark:text-neutral-400"
                  colSpan={bulk ? 10 : 9}
                >
                  No clients match the current filters.
                </td>
              </tr>
            ) : (
              <AnimatePresence initial={false}>
                {view.map((r, i) => {
                  const isSelected = !!checked[r.client.id];
                  const rate = r.client.rate ?? null;
                  const unit = unitLabel[r.client.charged_by];

                  return (
                    <motion.tr
                      key={r.client.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{
                        type: "spring",
                        stiffness: 240,
                        damping: 22,
                        mass: 0.9,
                        delay: Math.min(i * 0.012, 0.1),
                      }}
                      className={cx(
                        "border-b last:border-b-0 border-neutral-200 dark:border-neutral-800",
                        "transition-colors",
                        isSelected
                          ? "bg-indigo-500/10 dark:bg-indigo-500/15"
                          : "hover:bg-neutral-50/60 dark:hover:bg-white/5"
                      )}
                    >
                      {bulk && (
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            aria-label={`Select ${r.client.name}`}
                            name="ids[]"
                            value={r.client.id}
                            checked={isSelected}
                            onChange={(e) =>
                              setChecked((m) => ({
                                ...m,
                                [r.client.id]: e.target.checked,
                              }))
                            }
                          />
                        </td>
                      )}

                      {/* Date */}
                      <td className="px-3 py-3 text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
                        {shortDate(r.lastDate ?? r.client.created_at)}
                      </td>

                      {/* Client name + mobile subline */}
                      <td className="px-3 py-3 font-medium text-neutral-900 dark:text-neutral-100 max-w-0">
                        <span className="block truncate">{r.client.name}</span>

                        {/* NEW: mobile-only subline with charged_by + rate */}
                        <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400 md:hidden">
                          <span
                            className={cx(
                              "mr-2 inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium capitalize",
                              chargedClass[r.client.charged_by]
                            )}
                          >
                            {r.client.charged_by}
                          </span>
                          {rate != null && rate !== undefined ? (
                            <span className="align-middle">
                              {money(rate)} / {unit}
                            </span>
                          ) : null}
                        </span>
                      </td>

                      {/* Charged badge (hidden < md) */}
                      <td className="px-3 py-3 hidden md:table-cell">
                        <span
                          className={cx(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                            chargedClass[r.client.charged_by]
                          )}
                        >
                          {r.client.charged_by}
                        </span>
                      </td>

                      {/* Total projects (hidden < md) */}
                      <td className="px-3 py-3 text-right text-neutral-800 dark:text-neutral-200 hidden md:table-cell">
                        {r.projects}
                      </td>

                      {/* Earnings */}
                      <td className="px-3 py-3 text-right font-medium text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                        {money(r.payments)}
                      </td>

                      {/* Dues */}
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        {r.dues > 0 ? (
                          <span className="font-medium text-rose-600 dark:text-rose-400">
                            {money(r.dues)}
                          </span>
                        ) : (
                          <span className="text-neutral-500 dark:text-neutral-400">—</span>
                        )}
                      </td>

                      {/* Status (hidden < lg) */}
                      <td className="px-3 py-3 hidden lg:table-cell">
                        <span
                          className={cx(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                            statusClass[r.client.status]
                          )}
                        >
                          {r.client.status.replace("_", " ")}
                        </span>
                      </td>

                      {/* Active days (hidden < xl) */}
                      <td className="px-3 py-3 text-right text-neutral-800 dark:text-neutral-200 hidden xl:table-cell">
                        {r.activeDays}
                      </td>

                      {/* Actions – now “Open” + “Edit” on mobile too */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {/* Mobile */}
                          <div className="sm:hidden inline-flex items-center gap-2">
                            <Link
                              href={`/clients/${r.client.id}`}
                              className="rounded-lg px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                            >
                              Open
                            </Link>
                            <Link
                              href={`/clients/${r.client.id}/edit-client`}
                              className="rounded-lg px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                            >
                              Edit
                            </Link>
                          </div>

                          {/* Tablet/Desktop */}
                          <div className="hidden sm:flex items-center gap-2">
                            <Link
                              href={`/clients/${r.client.id}`}
                              className="rounded-lg px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                            >
                              View
                            </Link>
                            <Link
                              href={`/clients/${r.client.id}/edit-client`}
                              className="rounded-lg px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                            >
                              Edit
                            </Link>
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            )}
          </motion.tbody>
        </table>
      </div>
    </div>
  );
}
