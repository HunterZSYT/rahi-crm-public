// app/(app)/clients/[id]/payments-table.tsx
import { createClient } from "@/lib/supabase/server";
import { formatDateLong, formatMoney } from "@/lib/format";
import EditPayment from "./edit-payment"; // your existing inline editor

type PaymentRow = {
  id: string;
  date: string; // ISO date
  amount: string | number;
  medium: string;
  note: string | null;
};

const COLUMNS = "id,date,amount,medium,note" as const;

export default async function PaymentsTable({
  clientId,
  right, // optional toolbar slot (e.g., Add payment button)
}: {
  clientId: string;
  right?: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("payment_entries")
    .select(COLUMNS)
    .eq("client_id", clientId)
    .order("date", { ascending: false });

  if (error) {
    return <div className="text-red-700">{error.message}</div>;
  }

  const rows = (data ?? []) as PaymentRow[];
  const totalPaid = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return (
    <>
      {/* Toolbar: summary on the left, your controls on the right */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="inline-flex w-fit items-center gap-3 rounded-xl border bg-white/70 px-3 py-2 text-sm text-neutral-700">
          <span>
            {rows.length} payment{rows.length === 1 ? "" : "s"}
          </span>
          <span className="font-medium tabular-nums">{formatMoney(totalPaid)}</span>
        </div>

        {right ? <div className="flex items-center gap-2">{right}</div> : null}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[560px] w-full table-auto text-sm">
          <colgroup>
            <col className="w-[160px]" />
            <col className="w-[120px]" />
            <col className="w-[160px]" />
            <col />
          </colgroup>

          <thead className="sticky top-0 z-10 bg-neutral-50 text-neutral-800">
            <tr className="text-left">
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2">Medium</th>
              <th className="px-4 py-2">Note</th>
            </tr>
          </thead>

          <tbody className="text-neutral-900">
            {rows.map((r) => (
              <EditPayment
                key={r.id}
                initial={{
                  id: r.id,
                  date: r.date,
                  amount: Number(r.amount),
                  medium: r.medium,
                  note: r.note ?? "",
                }}
                trigger={
                  <tr className="border-t cursor-pointer hover:bg-neutral-50">
                    <td className="px-4 py-2 whitespace-nowrap">{formatDateLong(r.date)}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap tabular-nums">
                      {formatMoney(r.amount)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap capitalize">
                      {r.medium.replace("_", " ")}
                    </td>
                    <td className="px-4 py-2">
                      <span className="block truncate" title={r.note ?? ""}>
                        {r.note ?? "—"}
                      </span>
                    </td>
                  </tr>
                }
              />
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                  No payments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
