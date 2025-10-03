"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";

export default function StatusToggle({
  clientId,            // ✅ required
  id,                  // work entry id
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

        // Show any server error to help during dev
        let j: any = null;
        try { j = await res.json(); } catch {}
        if (!res.ok) throw new Error(j?.error || "Failed");

        setDelivered((d) => !d); // optimistic UI
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Failed to update status");
      }
    });
  }

  return (
    <button
      onClick={toggle}
      title={delivered ? "Mark as Processing" : "Mark as Delivered"}
      className="rounded-full border px-2 py-1 text-xs capitalize disabled:opacity-50"
      disabled={pending}
    >
      {pending ? "Saving…" : delivered ? "Delivered" : "Processing"}
    </button>
  );
}
