// app/(app)/clients/_components/Panel.tsx
export default function Panel({
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
    <div className={`rounded-2xl border bg-white/95 shadow-sm ${className}`}>
      <div className="flex items-center justify-between border-b px-5 py-3">
        <h3 className="text-base font-medium">{title}</h3>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
