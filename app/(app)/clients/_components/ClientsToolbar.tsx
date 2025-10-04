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

import { motion, MotionConfig } from "framer-motion";
import { Search, Loader2, Trash2, Plus, Ellipsis } from "lucide-react";

/* ---------------- utils ---------------- */
function setParam(sp: URLSearchParams, key: string, val?: string | null) {
  if (val == null || val === "") sp.delete(key);
  else sp.set(key, val);
}
const item = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.22 } } };
const hover = { y: -1.5, scale: 1.01 };
const tap = { scale: 0.98 };

/* ---------------- component ---------------- */
export default function ClientsToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // search (debounced)
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

  // bulk toggle
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
        {/* Search — full width on mobile */}
        <motion.div variants={item} className="relative min-w-0 flex-1 sm:w-[260px] sm:flex-none">
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400">
            {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          </span>
          <Input
            id="clients-q"
            name="q"
            aria-label="Search client"
            placeholder="Search client..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8"
          />
        </motion.div>

        {/* Desktop/Tablet actions (≥ sm) */}
        <div className="hidden flex-wrap items-center gap-2 sm:flex">
          <motion.div variants={item} whileHover={hover} whileTap={tap}
            className="[&_button]:!bg-indigo-600 [&_button]:!text-white [&_button:hover]:!bg-indigo-700 [&_button]:!border-transparent"
            title="Bulk upload">
            <BulkUpload />
          </motion.div>

          <motion.div variants={item} whileHover={hover} whileTap={tap}
            className="[&_button]:!bg-slate-700 [&_button]:!text-white [&_button:hover]:!bg-slate-800 [&_button]:!border-transparent"
            title="Export CSV">
            <ExportDialog />
          </motion.div>

          <motion.div variants={item} whileHover={hover} whileTap={tap}
            className="[&_button]:!bg-emerald-600 [&_button]:!text-white [&_button:hover]:!bg-emerald-700 [&_button]:!border-transparent"
            title="Create invoice">
            <InvoiceDialog />
          </motion.div>

          <motion.div variants={item} whileHover={hover} whileTap={tap}
            className="[&_button]:!bg-violet-600 [&_button]:!text-white [&_button:hover]:!bg-violet-700 [&_button]:!border-transparent"
            title="Quick add (work/payment)">
            <QuickAddDialog />
          </motion.div>
        </div>

        {/* Mobile “More” menu (< sm) */}
        <motion.div variants={item} className="sm:hidden">
          <MoreMenu>
            {/* make embedded buttons look like neutral menu items */}
            <li className="menu-li">
              <BulkUpload />
            </li>
            <li className="menu-li">
              <ExportDialog />
            </li>
            <li className="menu-li">
              <InvoiceDialog />
            </li>
            <li className="menu-li">
              <QuickAddDialog />
            </li>

            <li className="my-1 border-t border-neutral-200 dark:border-neutral-800" />

            {/* Bulk delete (moved into menu on mobile) */}
            <li>
              <button
                onClick={toggleBulk}
                className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                title={bulk ? "Exit bulk mode" : "Enter bulk mode to delete multiple"}
              >
                {bulk ? "Cancel bulk" : "Bulk delete"}
              </button>
            </li>

            {/* Add client (moved into menu on mobile) */}
            <li>
              <Link
                href="/clients/new"
                className="block w-full rounded-lg px-3 py-2 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-white/5"
                title="Add a new client"
              >
                Add client
              </Link>
            </li>
          </MoreMenu>
        </motion.div>

        {/* Bulk delete — keep visible only ≥ sm */}
        <motion.div variants={item} whileHover={hover} whileTap={tap} className="hidden sm:block">
          <Button
            variant="destructive"
            onClick={toggleBulk}
            disabled={isTogglingBulk}
            aria-disabled={isTogglingBulk}
            className="min-w-[112px] justify-center gap-2 px-3 py-2 text-sm sm:min-w-[132px]"
            title={bulk ? "Exit bulk mode" : "Enter bulk mode to delete multiple"}
          >
            {isTogglingBulk ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {bulk ? "Exiting…" : "Entering…"}
              </>
            ) : bulk ? (
              <>
                <Loader2 className="h-4 w-4 opacity-0" />
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

        {/* Add client — keep visible only ≥ sm */}
        <motion.div variants={item} whileHover={hover} whileTap={tap} className="hidden sm:block">
          <Link
            href="/clients/new"
            className="inline-flex items-center gap-2 rounded-xl bg-black px-3 py-2 text-sm font-medium text-white shadow-sm transition-[transform,box-shadow] hover:bg-neutral-900"
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

/* ---------------- Mobile “More” dropdown ---------------- */

function MoreMenu({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDetailsElement>(null);

  // close when clicking outside
  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const el = ref.current;
      if (!el || !el.open) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      el.open = false;
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <details ref={ref} className="relative">
      <summary
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background p-0 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-input/30 dark:border-input list-none [&::-webkit-details-marker]:hidden"
        aria-label="More actions"
      >
        <Ellipsis className="h-4 w-4" />
      </summary>

      <ul
        className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
        onClick={(e) => {
          const root = (e.currentTarget.parentElement as HTMLDetailsElement) || null;
          if (root) root.open = false;
        }}
      >
        {children}
      </ul>
    </details>
  );
}

/* ---- tailwind helpers for menu look (scopes to children buttons) ---- */
/* Put these in the same file or move to a global CSS if you prefer. */
declare module "react" { interface CSSProperties { } } // silence TS in Next env
