"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// header helpers (adjust paths if yours differ)
import SortableHeader from "./SortableHeader";
import HeaderMultiSelect from "./HeaderMultiSelect";
import DateHeaderRange from "./DateHeaderRange";

/** ---------------- Types the page already expects ---------------- */
export type Row = {
  client: {
    id: string;
    name: string;
    charged_by: "second" | "minute" | "hour" | "project";
    status: "active" | "closed" | "payment_expired";
    /** used as date fallback when a client has no delivered work yet */
    created_at?: string | null;
  };
  projects: number;
  payments: number;
  dues: number;
  earnings: number;
  activeDays: number;
  /** last delivered date (ISO) or null */
  lastDate: string | null;
};

type Props = {
  rows: Row[];
  /** current URL state pushed down from the page */
  selectedCharged: Array<Row["client"]["charged_by"]>;
  selectedStatus: Array<Row["client"]["status"]>;
  /** current date filter (from/to) coming from the URL */
  from: string | null;
  to: string | null;
  sortKey: string;
  sortDir: "asc" | "desc";
  bulk: boolean;
};

/** ---------------- Small helpers (local) ---------------- */
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

  // local sort state (initialize from props; changes do not update URL)
  const [sort, setSort] = React.useState<{ key: string; dir: "asc" | "desc" }>(
    { key: sortKey || "", dir: sortDir || "desc" }
  );

  // Bulk selection
  const [checked, setChecked] = React.useState<Record<string, boolean>>({});
  const allIds = React.useMemo(() => rows.map((r) => r.client.id), [rows]);
  const allSelected = allIds.length > 0 && allIds.every((id) => checked[id]);

  function toggleAll() {
    if (allSelected) {
      setChecked({});
    } else {
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
    if (
      selectedStatus.length > 0 &&
      !selectedStatus.includes(r.client.status)
    ) {
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
        case "earnings":
          av = a.earnings;
          bv = b.earnings;
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

  // ---- master clear filters ----
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

  // Build chips for the indicator
  const filterChips: Array<{ label: string; value: string }> = [];
  if (from || to) {
    const d = `${from ? shortDate(from) : "—"} → ${to ? shortDate(to) : "—"}`;
    filterChips.push({ label: "Date", value: d });
  }
  if (selectedCharged.length) {
    filterChips.push({
      label: "Charged",
      value: selectedCharged.map((s) => s[0].toUpperCase() + s.slice(1)).join(", "),
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

  // options for the multi-selects
  const chargedOptions = [
    { value: "second", label: "Second" },
    { value: "minute", label: "Minute" },
    { value: "hour", label: "Hour" },
    { value: "project", label: "Project" },
  ];
  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "closed", label: "Closed" },
    { value: "payment_expired", label: "Payment expired" },
  ];

  return (
    <div className="overflow-x-auto">
      {/* Filters indicator bar */}
      {hasFilters && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-neutral-50 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-neutral-700">
              Filters active
            </span>
            {filterChips.map((c) => (
              <span
                key={c.label}
                className="inline-flex items-center gap-1 rounded-lg border bg-white px-2 py-0.5 text-xs"
                title={`${c.label}: ${c.value}`}
              >
                <span className="text-neutral-500">{c.label}:</span>
                <span className="font-medium">{c.value}</span>
              </span>
            ))}
          </div>
          <button
            onClick={clearFilters}
            className="rounded-lg border px-2 py-1 text-xs font-medium hover:bg-white"
          >
            Clear filters
          </button>
        </div>
      )}

      <table className="w-full border-collapse text-sm">
        <thead className="bg-neutral-50">
          <tr className="border-b">
            {bulk && (
              <th className="w-[36px] px-3 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                />
              </th>
            )}

            {/* Date (sortable + range filter) */}
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

            {/* Client (sortable) */}
            <th className="px-3 py-2 text-left">
              <SortableHeader
                label="Client"
                active={sort.key === "client"}
                dir={sort.dir}
                onToggle={() => setSortKey("client")}
              />
            </th>

            {/* Charged By (sortable + multi-select filter) */}
            <th className="px-3 py-2 text-left">
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
                  options={chargedOptions}
                />
              </div>
            </th>

            {/* numeric columns (sortable) */}
            <th className="px-3 py-2 text-right">
              <SortableHeader
                label="Total Projects"
                active={sort.key === "projects"}
                dir={sort.dir}
                onToggle={() => setSortKey("projects")}
              />
            </th>
            <th className="px-3 py-2 text-right">
              <SortableHeader
                label="Earnings"
                active={sort.key === "earnings"}
                dir={sort.dir}
                onToggle={() => setSortKey("earnings")}
              />
            </th>
            <th className="px-3 py-2 text-right">
              <SortableHeader
                label="Payments"
                active={sort.key === "payments"}
                dir={sort.dir}
                onToggle={() => setSortKey("payments")}
              />
            </th>
            <th className="px-3 py-2 text-right">
              <SortableHeader
                label="Dues"
                active={sort.key === "dues"}
                dir={sort.dir}
                onToggle={() => setSortKey("dues")}
              />
            </th>

            {/* Status (sortable + multi-select filter) */}
            <th className="px-3 py-2 text-left">
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
                  options={statusOptions}
                />
              </div>
            </th>

            {/* Active Days (sortable) */}
            <th className="px-3 py-2 text-right">
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

        <tbody>
          {view.length === 0 ? (
            <tr>
              <td
                className="px-3 py-6 text-center text-neutral-500"
                colSpan={bulk ? 11 : 10}
              >
                No clients match the current filters.
              </td>
            </tr>
          ) : (
            view.map((r) => (
              <tr key={r.client.id} className="border-b">
                {bulk && (
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      name="ids[]"
                      value={r.client.id}
                      checked={!!checked[r.client.id]}
                      onChange={(e) =>
                        setChecked((m) => ({
                          ...m,
                          [r.client.id]: e.target.checked,
                        }))
                      }
                    />
                  </td>
                )}

                {/* Date cell uses delivered date, falling back to client's created_at */}
                <td className="px-3 py-2">
                  {shortDate(r.lastDate ?? r.client.created_at)}
                </td>

                <td className="px-3 py-2">{r.client.name}</td>
                <td className="px-3 py-2 capitalize">{r.client.charged_by}</td>
                <td className="px-3 py-2 text-right">{r.projects}</td>
                <td className="px-3 py-2 text-right">{money(r.earnings)}</td>
                <td className="px-3 py-2 text-right">{money(r.payments)}</td>
                <td className="px-3 py-2 text-right">
                  {r.dues > 0 ? money(r.dues) : "—"}
                </td>
                <td className="px-3 py-2 capitalize">
                  {r.client.status.replace("_", " ")}
                </td>
                <td className="px-3 py-2 text-right">{r.activeDays}</td>

                <td className="px-3 py-2">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/clients/${r.client.id}`}
                      className="text-blue-600"
                    >
                      View
                    </Link>
                    <Link
                      href={`/clients/${r.client.id}/edit-client`}
                      className="text-blue-600"
                    >
                      Edit
                    </Link>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
