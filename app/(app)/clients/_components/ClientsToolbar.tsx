// app/(app)/clients/_components/ClientsToolbar.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import BulkUpload from "./BulkUpload";
import ExportDialog from "./ExportDialog";
import InvoiceDialog from "./InvoiceDialog";
import QuickAddDialog from "./QuickAddDialog";

/** helper to write URL params */
function setParam(sp: URLSearchParams, key: string, val?: string | null) {
  if (val == null || val === "") sp.delete(key);
  else sp.set(key, val);
}

export default function ClientsToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // search box (debounced)
  const [q, setQ] = React.useState(searchParams.get("q") ?? "");
  React.useEffect(() => setQ(searchParams.get("q") ?? ""), [searchParams]);
  React.useEffect(() => {
    const t = setTimeout(() => {
      const sp = new URLSearchParams(searchParams.toString());
      setParam(sp, "q", q.trim() || null);
      router.replace(`${pathname}?${sp.toString()}`);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // bulk toggle
  const bulk = searchParams.get("bulk") === "1";
  function toggleBulk() {
    const sp = new URLSearchParams(searchParams.toString());
    setParam(sp, "bulk", bulk ? null : "1");
    router.replace(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative w-[260px]">
        <Input
          placeholder="Search client…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Each wrapper below recolors the *trigger button* inside the dialog.
         We scope styles to descendant buttons with Tailwind's [&_button] selector.
         This leaves your dialog internals untouched, but makes the toolbar buttons distinct. */}

      {/* Bulk upload → Indigo */}
      <div
        className="tb-btn tb-upload"
        title="Bulk upload"
        /* color the visible trigger button */
        /* bg/text/hover/focus */
        /* NOTE: the ! is to win over shadcn outline defaults */
        /* Only affects the toolbar button; harmless if dialogs render hidden buttons later */
        /* You can tweak shades as you like */
      >
        <div className="[&_button]:!bg-indigo-600 [&_button]:!text-white [&_button:hover]:!bg-indigo-700 [&_button]:!border-transparent">
          <BulkUpload />
        </div>
      </div>

      {/* Export → Slate */}
      <div className="[&_button]:!bg-slate-700 [&_button]:!text-white [&_button:hover]:!bg-slate-800 [&_button]:!border-transparent" title="Export CSV">
        <ExportDialog />
      </div>

      {/* Create invoice → Emerald/Green */}
      <div className="[&_button]:!bg-emerald-600 [&_button]:!text-white [&_button:hover]:!bg-emerald-700 [&_button]:!border-transparent" title="Create invoice">
        <InvoiceDialog />
      </div>

      {/* Quick add (Work/Payment) → Violet */}
      <div className="[&_button]:!bg-violet-600 [&_button]:!text-white [&_button:hover]:!bg-violet-700 [&_button]:!border-transparent" title="Quick add (work/payment)">
        <QuickAddDialog />
      </div>

      {/* Bulk delete toggle → Destructive red */}
      <Button
        variant="destructive"
        onClick={toggleBulk}
        title={bulk ? "Exit bulk mode" : "Enter bulk mode to delete multiple"}
        className="font-medium"
      >
        {bulk ? "Cancel bulk" : "Bulk delete"}
      </Button>

      {/* Add client → Primary/black (kept as-is, but bold for prominence) */}
      <Link
        href="/clients/new"
        className="rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-900"
        title="Add a new client"
      >
        Add client
      </Link>
    </div>
  );
}
