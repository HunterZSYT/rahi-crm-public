// app/(app)/clients/[id]/payments-table.tsx
import { createClient } from "@/lib/supabase/server";
import { formatDateLong, formatMoney } from "@/lib/format";
import EditPayment from "./edit-payment";

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
  right,
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
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-900/20 dark:text-red-300">
        {error.message}
      </div>
    );
  }

  const rows = (data ?? []) as PaymentRow[];
  const totalPaid = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return (
    <>
      {/* Toolbar */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-3 rounded-xl border border-neutral-200 bg-white/70 px-3 py-2 text-[13px] text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-200">
          <span>
            {rows.length} payment{rows.length === 1 ? "" : "s"}
          </span>
          <span className="font-medium tabular-nums">{formatMoney(totalPaid)}</span>
        </div>
        {right ? <div className="flex items-center gap-2">{right}</div> : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-auto text-[13px]">
          <caption className="sr-only">Payment entries</caption>
          <colgroup>
            <col className="w-[1%]" />
            <col className="w-[1%]" />
            <col className="w-[1%]" />
            <col />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-neutral-50/95 text-neutral-800 backdrop-blur supports-[backdrop-filter]:bg-neutral-50/80 dark:bg-neutral-900/80 dark:text-neutral-200">
            <tr className="text-left">
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 text-right font-medium">Amount</th>
              <th className="px-4 py-2 font-medium">Medium</th>
              <th className="px-4 py-2 font-medium">Note</th>
            </tr>
          </thead>

          <tbody className="text-neutral-900 dark:text-neutral-100">
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
                  <tr className="cursor-pointer border-t border-neutral-200 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/60">
                    <td className="whitespace-nowrap px-4 py-2">{formatDateLong(r.date)}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">
                      {formatMoney(r.amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 capitalize">
                      {r.medium.replace("_", " ")}
                    </td>
                    {/* Note: max-w-0 on the cell + truncate on inner span keeps table width tidy */}
                    <td className="max-w-0 px-4 py-2">
                      <span
                        className="block truncate text-neutral-700 dark:text-neutral-300"
                        title={r.note ?? ""}
                      >
                        {r.note ?? "—"}
                      </span>
                    </td>
                  </tr>
                }
              />
            ))}

            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-neutral-500 dark:text-neutral-400"
                >
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
