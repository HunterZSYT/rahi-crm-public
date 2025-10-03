// app/(app)/clients/[id]/page.tsx
import React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

import WorkTable from "./work-table";
import PaymentsTable from "./payments-table";
import AddPayment from "./add-payment";
import AddWork from "./add-work";
import WorkFilters, { WorkFiltersState } from "./work-filters";
import EditClientDialog from "./EditClientDialog"; // ⬅️ NEW

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

type WorkStatRow = {
  amount_due: number | null;
  status: "processing" | "delivered";
  delivered_at: string | null;
};

type PaymentRow = { amount: number | string };

/* ---------- helpers ---------- */
function money(n: string | number | null | undefined) {
  const num = Number(n || 0);
  return `৳${num.toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;
}

function daysBetween(minISO?: string | null, maxISO?: string | null) {
  if (!minISO || !maxISO) return 0;
  const a = new Date(minISO);
  const b = new Date(maxISO);
  return Math.max(0, Math.round((+b - +a) / 86400000) + 1);
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

  // --- fetch client with extra fields
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
        <Link href="/clients" className="text-blue-600">
          ← Back to clients
        </Link>
        <pre className="mt-4 rounded-xl bg-red-50 p-4 text-red-700">
          {clientErr?.message ?? "Client not found"}
        </pre>
      </main>
    );
  }

  // --- fetch stats for KPIs (no RPC; compute here)
  const [{ data: works }, { data: pays }] = await Promise.all([
    supabase
      .from("work_entries")
      .select("amount_due,status,delivered_at")
      .eq("client_id", id),
    supabase.from("payment_entries").select("amount").eq("client_id", id),
  ]);

  const delivered = (works ?? []).filter(
    (w) => w.status === "delivered"
  ) as WorkStatRow[];

  const deliveredSum = delivered.reduce(
    (s, r) => s + Number(r.amount_due || 0),
    0
  );
  const totalProjects = delivered.length;

  const totalPayments = (pays ?? []).reduce(
    (s, r) => s + Number((r as PaymentRow).amount || 0),
    0
  );

  const totalDues = Math.max(0, deliveredSum - totalPayments);

  // ✅ Recognize earnings only when all dues are cleared
  const recognizedEarnings = totalDues === 0 ? deliveredSum : 0;

  let minDelivered: string | null = null;
  let maxDelivered: string | null = null;
  for (const r of delivered) {
    if (!r.delivered_at) continue;
    if (!minDelivered || r.delivered_at < minDelivered)
      minDelivered = r.delivered_at;
    if (!maxDelivered || r.delivered_at > maxDelivered)
      maxDelivered = r.delivered_at;
  }
  const activeDays = daysBetween(minDelivered, maxDelivered);

  return (
    <main className="w-full px-6 xl:px-10 py-10 space-y-10">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">{client.name}</h1>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full border px-3 py-1 capitalize">
              {client.charged_by}
            </span>
            <span className="rounded-full border px-3 py-1">
              Rate: {money(client.rate)}
            </span>
            <span className="rounded-full border px-3 py-1 capitalize">
              {client.status.replace("_", " ")}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/clients" className="rounded-xl border px-3 py-1.5">
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
          label="Total Payments"
          value={money(totalPayments)}
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
      <Panel
        title="Client info"
        right={<EditClientDialog client={client} />} // ⬅️ NEW
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <InfoRow label="Contact name" value={client.contact_name || "—"} />
          <InfoRow label="Designation" value={client.designation || "—"} />
          <InfoRow
            label="Email"
            value={
              client.email ? (
                <a className="text-blue-600" href={`mailto:${client.email}`}>
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
                <a className="text-blue-600" href={`tel:${client.phone}`}>
                  {client.phone}
                </a>
              ) : (
                "—"
              )
            }
          />
          <div className="md:col-span-2">
            <div className="text-xs text-neutral-500 mb-1">Note</div>
            <div className="rounded-xl border bg-neutral-50 px-3 py-2">
              {client.note?.trim() || "—"}
            </div>
          </div>
        </div>
      </Panel>

      {/* Tables */}
      <section className="grid grid-cols-12 gap-8">
        <Panel className="col-span-12 xl:col-span-7" title="Work entries">
          <div className="mb-3">
            <WorkFilters current={filters} />
          </div>
          <div className="overflow-x-auto">
            <WorkTable
              clientId={client.id}
              filters={filters}
              right={
                <AddWork
                  clientId={client.id}
                  defaultBasis={client.charged_by}
                  defaultRate={client.rate}
                />
              }
            />
          </div>
        </Panel>

        <Panel className="col-span-12 xl:col-span-5" title="Payments">
          <div className="overflow-x-auto">
            <PaymentsTable
              clientId={client.id}
              right={<AddPayment clientId={client.id} />}
            />
          </div>
        </Panel>
      </section>
    </main>
  );
}

/* ------- tiny UI bits ------- */

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
    <div className={`rounded-2xl border bg-white p-5 shadow-sm ${className}`}>
      <div className="text-sm text-neutral-500">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

function Panel({
  title,
  children,
  className = "",
  right,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  right?: React.ReactNode; // ⬅️ NEW
}) {
  return (
    <div className={`w-full rounded-2xl border bg-white/95 shadow-sm ${className}`}>
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h3 className="text-base font-medium">{title}</h3>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border px-3 py-2">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}
