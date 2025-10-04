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

import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import {
  Search,
  Loader2,
  Trash2,
  Plus,
} from "lucide-react";

/** helper to write URL params */
function setParam(sp: URLSearchParams, key: string, val?: string | null) {
  if (val == null || val === "") sp.delete(key);
  else sp.set(key, val);
}

// small motion helpers
const item = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22 } },
};
const hover = { y: -1.5, scale: 1.01 };
const tap = { scale: 0.98 };

export default function ClientsToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ---------------- Search (debounced) ----------------
  const [q, setQ] = React.useState(searchParams.get("q") ?? "");
  const [isSearching, startSearching] = React.useTransition();

  React.useEffect(() => setQ(searchParams.get("q") ?? ""), [searchParams]);

  React.useEffect(() => {
    const t = setTimeout(() => {
      const sp = new URLSearchParams(searchParams.toString());
      setParam(sp, "q", q.trim() || null);
      startSearching(() => router.replace(`${pathname}?${sp.toString()}`));
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // ---------------- Bulk toggle (with loading) ----------------
  const bulk = searchParams.get("bulk") === "1";
  const [isTogglingBulk, startToggleBulk] = React.useTransition();
  function toggleBulk() {
    const sp = new URLSearchParams(searchParams.toString());
    setParam(sp, "bulk", bulk ? null : "1");
    startToggleBulk(() => router.replace(`${pathname}?${sp.toString()}`));
  }

  return (
    <MotionConfig transition={{ type: "spring", stiffness: 380, damping: 28 }}>
      <motion.div
        className="flex w-full flex-wrap items-center gap-2"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
      >
        {/* Search */}
        <motion.div variants={item} className="relative w-[260px] max-w-full">
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400">
            {isSearching ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Search size={16} />
            )}
          </span>
          <Input
            placeholder="Search client..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8"
          />
        </motion.div>

        {/* Bulk upload → Indigo */}
        <motion.div
          variants={item}
          whileHover={hover}
          whileTap={tap}
          className="[&_button]:!bg-indigo-600 [&_button]:!text-white [&_button:hover]:!bg-indigo-700 [&_button]:!border-transparent"
          title="Bulk upload"
        >
          <BulkUpload />
        </motion.div>

        {/* Export → Slate */}
        <motion.div
          variants={item}
          whileHover={hover}
          whileTap={tap}
          className="[&_button]:!bg-slate-700 [&_button]:!text-white [&_button:hover]:!bg-slate-800 [&_button]:!border-transparent"
          title="Export CSV"
        >
          <ExportDialog />
        </motion.div>

        {/* Create invoice → Emerald */}
        <motion.div
          variants={item}
          whileHover={hover}
          whileTap={tap}
          className="[&_button]:!bg-emerald-600 [&_button]:!text-white [&_button:hover]:!bg-emerald-700 [&_button]:!border-transparent"
          title="Create invoice"
        >
          <InvoiceDialog />
        </motion.div>

        {/* Quick add (work/payment) → Violet */}
        <motion.div
          variants={item}
          whileHover={hover}
          whileTap={tap}
          className="[&_button]:!bg-violet-600 [&_button]:!text-white [&_button:hover]:!bg-violet-700 [&_button]:!border-transparent"
          title="Quick add (work/payment)"
        >
          <QuickAddDialog />
        </motion.div>

        {/* Bulk delete toggle → Destructive red */}
        <motion.div variants={item} whileHover={hover} whileTap={tap}>
          <Button
            variant="destructive"
            onClick={toggleBulk}
            disabled={isTogglingBulk}
            aria-disabled={isTogglingBulk}
            className="font-medium min-w-[132px] justify-center gap-2"
            title={bulk ? "Exit bulk mode" : "Enter bulk mode to delete multiple"}
          >
            {isTogglingBulk ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {bulk ? "Exiting…" : "Entering…"}
              </>
            ) : bulk ? (
              <>
                <Loader2 className="h-4 w-4 opacity-0" /> {/* keeps width stable */}
                Cancel bulk
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Bulk delete
              </>
            )}
          </Button>
        </motion.div>

        {/* Add client → bold/black */}
        <motion.div variants={item} whileHover={hover} whileTap={tap}>
          <Link
            href="/clients/new"
            className="inline-flex items-center gap-2 rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-[transform,box-shadow] hover:bg-neutral-900"
            title="Add a new client"
          >
            <Plus className="h-4 w-4" />
            Add client
          </Link>
        </motion.div>
      </motion.div>
    </MotionConfig>
  );
}
