"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import BulkUpload from "./BulkUpload";
import ExportDialog from "./ExportDialog";
import InvoiceDialog from "./InvoiceDialog"; // ← NEW

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
  }, [q]); // eslint-disable-line

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

      {/* Bulk upload modal */}
      <BulkUpload />

      {/* Export (CSV) picker */}
      <ExportDialog />

      {/* Create invoice (PDF) */}
      <InvoiceDialog />

      {/* Bulk delete toggle */}
      <Button variant="outline" onClick={toggleBulk}>
        {bulk ? "Cancel bulk" : "Bulk delete"}
      </Button>

      {/* Add client */}
      <Link
        href="/clients/new"
        className="rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white"
      >
        Add client
      </Link>
    </div>
  );
}
