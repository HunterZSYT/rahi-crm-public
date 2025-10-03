// app/(app)/clients/_components/StatCard.tsx
export default function StatCard({
  label,
  value,
  className = "",
  sub,
}: {
  label: string;
  value: string;
  className?: string;
  sub?: { label: string; value: string }[];
}) {
  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm ${className}`}>
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
      {sub && sub.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-neutral-700">
          {sub.map((s) => (
            <div key={s.label} className="flex items-center justify-between rounded-lg border px-2 py-1">
              <span>{s.label}</span>
              <span className="font-medium">{s.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
