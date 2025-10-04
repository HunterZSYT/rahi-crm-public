// app/(app)/clients/page.tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

import Panel from "./_components/Panel";
import StatCard from "./_components/StatCard";
import MiniTable from "./_components/MiniTable";
import ClientsTable, { type Row } from "./_components/ClientsTable";
import ClientsToolbar from "./_components/ClientsToolbar";

import { arrParam, keepParams, money } from "./_lib/table";
import { getGlobalTotals } from "@/app/(app)/_lib/stats";

/* ---- types ---- */
type Client = {
  id: string;
  name: string;
  charged_by: "second" | "minute" | "hour" | "project";
  rate: number;
  status: "active" | "closed" | "payment_expired";
  contact_name: string | null;
  designation: string | null;
  email: string | null;
  phone: string | null;
  note: string | null;
  created_at: string; // fallback for table date filters
};
type Work = {
  client_id: string;
  status: "processing" | "delivered";
  amount_due: number | null;
  delivered_at: string | null;
  date: string;
};
type Payment = { client_id: string; amount: number | string; date?: string };
type ActiveDaysRow = { client_id: string; active_days: number };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  // --- analytics range (top cards) ---
  const start =
    typeof sp.start === "string" && sp.start.length > 0 ? sp.start : null;
  const end = typeof sp.end === "string" && sp.end.length > 0 ? sp.end : null;

  // --- table filters/sort/bulk (URL state) ---
  const selectedCharged = arrParam(sp, "charged").filter((x) =>
    ["second", "minute", "hour", "project"].includes(x)
  ) as Client["charged_by"][];
  const selectedStatus = arrParam(sp, "status").filter((x) =>
    ["active", "closed", "payment_expired"].includes(x)
  ) as Client["status"][];

  const q =
    typeof sp.q === "string" && sp.q.trim().length > 0
      ? sp.q.trim().toLowerCase()
      : "";
  const from =
    typeof sp.from === "string" && sp.from.length > 0 ? sp.from : null;
  const to = typeof sp.to === "string" && sp.to.length > 0 ? sp.to : null;

  const sortKey =
    typeof sp.sort === "string" ? (sp.sort.toLowerCase() as string) : "";
  const sortDir =
    sp.dir === "asc" || sp.dir === "desc" ? (sp.dir as "asc" | "desc") : "desc";
  const bulk = sp.bulk === "1";

  const supabase = await createClient();

  /* ---------- Base client list (no date filter) ---------- */
  const { data: clients } = (await supabase
    .from("clients")
    .select(
      "id,name,charged_by,rate,status,contact_name,designation,email,phone,note,created_at"
    )) as any;
  const clientList = (clients ?? []) as Client[];

  /* ---------- Lifetime aggregates for the table ---------- */
  const [{ data: worksAll }, { data: paysAll }, { data: actRows }] =
    await Promise.all([
      supabase
        .from("work_entries")
        .select("client_id,status,amount_due,delivered_at,date") as any,
      supabase.from("payment_entries").select("client_id,amount") as any,
      supabase
        .from("v_client_active_days")
        .select("client_id,active_days") as any,
    ]);

  const activeDaysMap = new Map<string, number>();
  for (const r of (actRows ?? []) as ActiveDaysRow[]) {
    activeDaysMap.set(r.client_id, Number(r.active_days) || 0);
  }

  const workListAll = (worksAll ?? []) as Work[];
  const payListAll = (paysAll ?? []) as Payment[];

  const lifetime = new Map<
    string,
    {
      client: Client;
      deliveredSum: number;
      payments: number;
      dues: number;
      projects: number;
      minDelivered: string | null;
      maxDelivered: string | null;
    }
  >();

  for (const c of clientList) {
    lifetime.set(c.id, {
      client: c,
      deliveredSum: 0,
      payments: 0,
      dues: 0,
      projects: 0,
      minDelivered: null,
      maxDelivered: null,
    });
  }

  const deliveredAll = workListAll.filter((w) => w.status === "delivered");
  for (const w of deliveredAll) {
    const agg = lifetime.get(w.client_id);
    if (!agg) continue;
    agg.deliveredSum += Number(w.amount_due || 0);
    agg.projects += 1;
    if (w.delivered_at) {
      if (!agg.minDelivered || w.delivered_at < agg.minDelivered)
        agg.minDelivered = w.delivered_at;
      if (!agg.maxDelivered || w.delivered_at > agg.maxDelivered)
        agg.maxDelivered = w.delivered_at;
    }
  }
  for (const p of payListAll) {
    const agg = lifetime.get(p.client_id);
    if (!agg) continue;
    agg.payments += Number(p.amount || 0);
  }
  for (const [id, agg] of lifetime) {
    agg.dues = Math.max(0, agg.deliveredSum - agg.payments);
    lifetime.set(id, agg);
  }

  /* ---------- Analytics (filtered by optional date range) ---------- */
  const worksQ = supabase
    .from("work_entries")
    .select("client_id,status,amount_due,delivered_at,date");
  if (start) worksQ.gte("date", start);
  if (end) worksQ.lte("date", end);

  const paysQ = supabase.from("payment_entries").select("client_id,amount,date");
  if (start) paysQ.gte("date", start);
  if (end) paysQ.lte("date", end);

  const [{ data: worksFiltered }, { data: paysFiltered }] = await Promise.all([
    worksQ,
    paysQ,
  ]);

  const workListRange = (worksFiltered ?? []) as Work[];
  const payListRange = (paysFiltered ?? []) as Payment[];

  const deliveredRange = workListRange.filter((w) => w.status === "delivered");
  const processingRange = workListRange.filter(
    (w) => w.status === "processing"
  );
  const globalProjects = deliveredRange.length;

  // Payments are treated as earnings; dues computed separately
  const {
    totalPayments: globalPayments, // = earnings
    totalDues: globalDues,
  } = await getGlobalTotals({ start, end });

  const statuses = {
    active: clientList.filter((c) => c.status === "active").length,
    closed: clientList.filter((c) => c.status === "closed").length,
    payment_expired: clientList.filter((c) => c.status === "payment_expired")
      .length,
  };

  // per-client totals for top lists (filtered)
  const byClientRange = new Map<
    string,
    { name: string; deliveredSum: number; payments: number; dues: number }
  >();
  for (const c of clientList) {
    byClientRange.set(c.id, {
      name: c.name,
      deliveredSum: 0,
      payments: 0,
      dues: 0,
    });
  }
  for (const w of deliveredRange) {
    const agg = byClientRange.get(w.client_id);
    if (agg) agg.deliveredSum += Number(w.amount_due || 0);
  }
  for (const p of payListRange) {
    const agg = byClientRange.get(p.client_id);
    if (agg) agg.payments += Number(p.amount || 0);
  }
  for (const [id, agg] of byClientRange) {
    agg.dues = Math.max(0, agg.deliveredSum - agg.payments);
    byClientRange.set(id, agg);
  }

  /* ---------- Build table rows (server; used by ClientsTable) ---------- */
  let rows: Row[] = clientList.map((c) => {
    const agg = lifetime.get(c.id);
    const deliveredSum = agg?.deliveredSum ?? 0;
    const payments = agg?.payments ?? 0;
    const dues = Math.max(0, deliveredSum - payments);
    const earnings = Math.max(0, payments - dues); // keep existing table logic
    const lastDate = agg?.maxDelivered ?? null;

    // Active days from view (unique work dates)
    const activeDays = activeDaysMap.get(c.id) ?? 0;

    return {
      client: {
        id: c.id,
        name: c.name,
        charged_by: c.charged_by,
        status: c.status,
        created_at: c.created_at,
      },
      projects: agg?.projects ?? 0,
      payments,
      dues,
      earnings,
      activeDays,
      lastDate,
    };
  });

  // filter on first paint (with delivered fallback to created_at)
  if (q) rows = rows.filter((r) => r.client.name.toLowerCase().includes(q));
  if (from)
    rows = rows.filter((r) => {
      const d = r.lastDate ?? r.client.created_at ?? null;
      return d && d >= from;
    });
  if (to)
    rows = rows.filter((r) => {
      const d = r.lastDate ?? r.client.created_at ?? null;
      return d && d <= to;
    });

  const persistKeys = [
    "start",
    "end",
    "charged",
    "status",
    "q",
    "from",
    "to",
    "sort",
    "dir",
    "bulk",
  ];

  return (
    <main className="w-full px-6 xl:px-10 py-10 space-y-8">
      {/* -------- Analytics (collapsible) -------- */}
      <details open className="rounded-2xl border bg-white/95 shadow-sm">
        <summary className="cursor-pointer select-none list-none px-5 py-3 text-sm font-medium text-neutral-800">
          <div className="flex items-center justify-between">
            <span>Welcome Rahi! Here’s your analytics at a glance</span>
            <span className="text-neutral-500">Toggle</span>
          </div>
        </summary>

        <div className="px-5 pb-5">
          {/* KPI date range */}
          <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-neutral-600">
                Start date
              </label>
              <input
                type="date"
                name="start"
                defaultValue={start ?? ""}
                className="w-[180px] rounded-xl border p-2 outline-none focus:ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-600">
                End date
              </label>
              <input
                type="date"
                name="end"
                defaultValue={end ?? ""}
                className="w-[180px] rounded-xl border p-2 outline-none focus:ring"
              />
            </div>
            <button
              type="submit"
              className="h-[40px] rounded-xl border px-3 text-sm font-medium"
            >
              Apply
            </button>
            {(start || end) && (
              <Link
                href={keepParams(sp, persistKeys, {
                  start: undefined,
                  end: undefined,
                })}
                className="h-[40px] rounded-xl border px-3 text-sm font-medium"
              >
                Clear
              </Link>
            )}
          </form>

          {/* KPIs */}
          <section className="grid grid-cols-12 gap-4">
            <StatCard
              className="col-span-12 md:col-span-3"
              label="Global Total Projects"
              value={`${globalProjects}`}
              sub={[
                { label: "Delivered", value: String(globalProjects) },
                { label: "Processing", value: String(processingRange.length) },
              ]}
            />
            {/* Payments are treated as earnings */}
            <StatCard
              className="col-span-12 md:col-span-3"
              label="Global Total Earnings"
              value={money(globalPayments)}
            />
            <StatCard
              className="col-span-12 md:col-span-3"
              label="Global Total Dues"
              value={globalDues > 0 ? money(globalDues) : "—"}
            />

            {/* Status panel sits as the 4th block */}
            <div className="col-span-12 md:col-span-3 rounded-2xl border bg-white p-4 shadow-sm">
              <div className="text-xs text-neutral-500">Global Client Status</div>
              <ul className="mt-2 space-y-1 text-sm">
                <li className="flex items-center justify-between">
                  <span>Active</span>
                  <span className="font-medium">{statuses.active}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Closed</span>
                  <span className="font-medium">{statuses.closed}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Payment expired</span>
                  <span className="font-medium">{statuses.payment_expired}</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Top lists */}
          <section className="mt-4 grid grid-cols-12 gap-4">
            <Panel className="col-span-12 lg:col-span-6" title="Top 5 High Paying Clients">
              <MiniTable
                headers={["Client", "Payments"]}
                rows={[...byClientRange.values()]
                  .sort((a, b) => b.payments - a.payments)
                  .slice(0, 5)
                  .map((r) => [r.name, money(r.payments)])}
                empty="No data"
                rightAlign={[1]}
              />
            </Panel>
            <Panel className="col-span-12 lg:col-span-6" title="Top 5 Due Clients">
              <MiniTable
                headers={["Client", "Due"]}
                rows={[...byClientRange.values()]
                  .sort((a, b) => b.dues - a.dues)
                  .slice(0, 5)
                  .map((r) => [r.name, money(r.dues)])}
                empty="No data"
                rightAlign={[1]}
              />
            </Panel>
          </section>
        </div>
      </details>

      {/* -------- Clients table (lifetime) -------- */}
      <Panel title="Clients" className="w-full" right={<ClientsToolbar />}>
        {bulk ? (
          <form method="post" action="/api/clients/bulk-delete">
            <div className="mb-3">
              <button
                type="submit"
                className="rounded-xl bg-red-600 px-3 py-1.5 text-sm font-medium text-white"
              >
                Delete selected
              </button>
            </div>
            <ClientsTable
              rows={rows}
              selectedCharged={selectedCharged}
              selectedStatus={selectedStatus}
              start={start}
              end={end}
              from={from}
              to={to}
              sortKey={sortKey}
              sortDir={sortDir}
              bulk
            />
          </form>
        ) : (
          <ClientsTable
            rows={rows}
            selectedCharged={selectedCharged}
            selectedStatus={selectedStatus}
            start={start}
            end={end}
            from={from}
            to={to}
            sortKey={sortKey}
            sortDir={sortDir}
            bulk={false}
          />
        )}
      </Panel>
    </main>
  );
}
