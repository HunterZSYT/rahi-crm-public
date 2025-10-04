"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";

export default function StatusToggle({
  clientId,
  id,
  deliveredAt,
}: {
  clientId: string;
  id: string;
  deliveredAt: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [delivered, setDelivered] = useState<boolean>(!!deliveredAt);

  function toggle() {
    start(async () => {
      try {
        const res = await fetch(`/api/clients/${clientId}/work`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, delivered: !delivered }),
        });

        let j: any = null;
        try {
          j = await res.json();
        } catch {}
        if (!res.ok) throw new Error(j?.error || "Failed");

        setDelivered((d) => !d); // optimistic UI
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Failed to update status");
      }
    });
  }

  const base =
    "rounded-full px-2 py-1 text-[12px] font-medium ring-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-600 disabled:opacity-60";
  const styles = delivered
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-700/50 dark:hover:bg-emerald-900/50"
    : "bg-slate-50 text-slate-700 ring-slate-200 hover:bg-slate-100 dark:bg-neutral-900/40 dark:text-neutral-300 dark:ring-neutral-700 dark:hover:bg-neutral-800/60";

  return (
    <button
      onClick={toggle}
      aria-pressed={delivered}
      title={delivered ? "Mark as Processing" : "Mark as Delivered"}
      className={`${base} ${styles}`}
      disabled={pending}
    >
      {pending ? "Saving…" : delivered ? "Delivered" : "Processing"}
    </button>
  );
}
