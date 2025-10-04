import React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

import WorkTable from "./work-table";
import PaymentsTable from "./payments-table";
import AddPayment from "./add-payment";
import AddWork from "./add-work";
import WorkFilters, { WorkFiltersState } from "./work-filters";
import EditClientDialog from "./EditClientDialog";
import EditVariantsDialog from "./EditVariantsDialog";

/* ---------- types ---------- */
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
};

type WorkRow = {
  amount_due: number | null;
  status: "processing" | "delivered";
  delivered_at: string | null;
};

type PaymentRow = { amount: number | string };
type ActiveDaysRow = { active_days: number };

/* ---------- helpers ---------- */
function money(n: string | number | null | undefined) {
  const num = Number(n || 0);
  return `৳${num.toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;
}

/* ---------- page ---------- */
export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const filters: WorkFiltersState = {
    status: (sp.status as WorkFiltersState["status"]) || "all",
    basis: (sp.basis as WorkFiltersState["basis"]) || "all",
    mode: (sp.mode as WorkFiltersState["mode"]) || "all",
  };

  const supabase = await createClient();

  // --- fetch client
  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .select(
      "id,name,charged_by,rate,status,contact_name,designation,email,phone,note"
    )
    .eq("id", id)
    .single<Client>();

  if (clientErr || !client) {
    return (
      <main className="w-full px-6 xl:px-10 py-10">
        <Link
          href="/clients"
          className="inline-flex items-center rounded-xl border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
        >
          ← Back to clients
        </Link>
        <pre className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {clientErr?.message ?? "Client not found"}
        </pre>
      </main>
    );
  }

  // --- fetch stats
  const [{ data: works }, { data: pays }, { data: adRow }] = await Promise.all([
    supabase
      .from("work_entries")
      .select("amount_due,status,delivered_at")
      .eq("client_id", id),
    supabase.from("payment_entries").select("amount").eq("client_id", id),
    supabase
      .from("v_client_active_days")
      .select("active_days")
      .eq("client_id", id)
      .maybeSingle<ActiveDaysRow>(),
  ]);

  const workList = (works ?? []) as WorkRow[];

  const delivered = workList.filter((w) => w.status === "delivered");
  const deliveredSum = delivered.reduce((s, r) => s + Number(r.amount_due || 0), 0);
  const totalProjects = delivered.length;

  const totalPayments = (pays ?? []).reduce(
    (s, r) => s + Number((r as PaymentRow).amount || 0),
    0
  );
  const recognizedEarnings = totalPayments;

  const totalDues = Math.max(0, deliveredSum - totalPayments);
  const activeDays = Number(adRow?.active_days ?? 0);

  return (
    <main className="relative w-full space-y-10 px-6 py-10 xl:px-10">
      {/* page background accent - theme aware */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-indigo-50/40 to-transparent dark:from-zinc-800/60" />

      {/* Header row */}
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <h1 className="truncate text-2xl font-semibold tracking-tight dark:text-neutral-100">
            {client.name}
          </h1>
          <div className="flex flex-wrap gap-2 text-[13px]">
            <Badge>{client.charged_by}</Badge>
            <Badge>Rate: {money(client.rate)}</Badge>
            <StatusBadge status={client.status} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/clients"
            className="inline-flex items-center rounded-xl border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-900"
          >
            Back
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <section className="grid grid-cols-12 gap-6">
        <Card
          className="col-span-12 sm:col-span-6 lg:col-span-3 xl:col-span-2"
          label="Total Projects"
          value={`${totalProjects}`}
        />
        <Card
          className="col-span-12 sm:col-span-6 lg:col-span-3 xl:col-span-2"
          label="Total Earnings"
          value={money(recognizedEarnings)}
        />
        <Card
          className="col-span-12 sm:col-span-6 lg:col-span-3 xl:col-span-2"
          label="Total Dues"
          value={totalDues > 0 ? money(totalDues) : "—"}
        />
        <Card
          className="col-span-12 sm:col-span-6 lg:col-span-3 xl:col-span-2"
          label="Active Days"
          value={`${activeDays}`}
        />
      </section>

      {/* Client info panel + inline edit button */}
      <Panel title="Client info" right={<EditClientDialog client={client} />}>
        <div className="grid grid-cols-1 gap-4 text-[13.5px] md:grid-cols-2">
          <InfoRow label="Contact name" value={client.contact_name || "—"} />
          <InfoRow label="Designation" value={client.designation || "—"} />
          <InfoRow
            label="Email"
            value={
              client.email ? (
                <a className="text-blue-600 dark:text-blue-400" href={`mailto:${client.email}`}>
                  {client.email}
                </a>
              ) : (
                "—"
              )
            }
          />
          <InfoRow
            label="Phone"
            value={
              client.phone ? (
                <a className="text-blue-600 dark:text-blue-400" href={`tel:${client.phone}`}>
                  {client.phone}
                </a>
              ) : (
                "—"
              )
            }
          />
          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">Note</div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">
              {client.note?.trim() || "—"}
            </div>
          </div>
        </div>
      </Panel>

      {/* Tables */}
      <section className="grid grid-cols-12 items-start gap-8">
        {/* Work gets more width */}
        <Panel
          className="col-span-12 xl:col-span-8 2xl:col-span-9"
          title="Work entries"
          right={
            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
              {/* Outline / neutral look for Edit variants */}
              <div className="[&_button]:!h-9 [&_button]:!rounded-xl [&_button]:!border-neutral-300 [&_button]:!bg-white [&_button]:!text-neutral-900 dark:[&_button]:!bg-neutral-900 dark:[&_button]:!text-neutral-100">
                <EditVariantsDialog clientId={client.id} />
              </div>

              {/* Primary emphasis for Add entry */}
              <div className="[&_button]:!h-9 [&_button]:!rounded-xl [&_button]:!bg-indigo-600 [&_button]:!text-white [&_button:hover]:!bg-indigo-700 [&_button]:!border-transparent [&_button]:shadow-sm">
                <AddWork
                  clientId={client.id}
                  defaultBasis={client.charged_by}
                  defaultRate={client.rate}
                />
              </div>
            </div>
          }
        >
          <div className="mb-3">
            <WorkFilters current={filters} />
          </div>

          {/* ⬇️ No 'right' prop here anymore — avoids duplicate buttons */}
          <div className="overflow-x-auto">
            <WorkTable clientId={client.id} filters={filters} />
          </div>
        </Panel>

        {/* Payments stays compact */}
        <Panel
          className="col-span-12 xl:col-span-4 2xl:col-span-3"
          title="Payments"
          right={<AddPayment clientId={client.id} />}
        >
          <div className="overflow-x-auto">
            <PaymentsTable clientId={client.id} />
          </div>
        </Panel>
      </section>
    </main>
  );
}

/* ------- tiny UI bits ------- */

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-neutral-200 bg-white/70 px-3 py-1 capitalize text-neutral-700 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-950/70 dark:text-neutral-300">
      {children}
    </span>
  );
}

function StatusBadge({ status }: { status: Client["status"] }) {
  const map: Record<Client["status"], string> = {
    active:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-900/40",
    closed:
      "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-300 dark:border-slate-800",
    payment_expired:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-900/40",
  };
  return (
    <span
      className={`rounded-full border px-3 py-1 capitalize ${map[status]}`}
      title={status.replace("_", " ")}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function Card({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 ${className}`}
    >
      <div className="text-sm text-neutral-500 dark:text-neutral-400">{label}</div>
      <div className="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
        {value}
      </div>
    </div>
  );
}

/** Responsive panel header */
function Panel({
  title,
  children,
  className = "",
  right,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  right?: React.ReactNode;
}) {
  return (
    <div
      className={`w-full rounded-2xl border border-neutral-200 bg-white/95 shadow-sm backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-950/80 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
        <h3 className="min-w-0 flex-1 truncate text-base font-medium text-neutral-900 dark:text-neutral-100">
          {title}
        </h3>
        {right ? (
          <div className="w-full shrink-0 sm:w-auto">
            <div className="flex flex-wrap items-center justify-end gap-2">
              {right}
            </div>
          </div>
        ) : null}
      </div>
      <div className="p-5 text-neutral-900 dark:text-neutral-200">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-200 px-3 py-2 dark:border-neutral-800">
      <div className="text-xs text-neutral-500 dark:text-neutral-400">{label}</div>
      <div className="mt-0.5 text-neutral-900 dark:text-neutral-200">{value}</div>
    </div>
  );
}
