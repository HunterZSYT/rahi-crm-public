// app/(app)/clients/_components/MiniTable.tsx
export default function MiniTable({
  headers,
  rows,
  empty,
  rightAlign = [],
}: {
  headers: string[];
  rows: (string | number)[][];
  empty: string;
  rightAlign?: number[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-auto text-sm">
        <thead className="bg-neutral-50 text-neutral-800">
          <tr className="text-left">
            {headers.map((h, i) => (
              <th key={i} className={`px-4 py-2 ${rightAlign.includes(i) ? "text-right" : ""}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx} className="border-t">
              {r.map((c, i) => (
                <td key={i} className={`px-4 py-2 ${rightAlign.includes(i) ? "text-right" : ""}`}>{c}</td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={headers.length} className="px-4 py-6 text-center text-neutral-500">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
