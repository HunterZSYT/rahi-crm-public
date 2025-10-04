"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function DateHeaderRange() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [open, setOpen] = React.useState(false);
  const [from, setFrom] = React.useState(sp.get("from") ?? "");
  const [to, setTo] = React.useState(sp.get("to") ?? "");

  React.useEffect(() => setFrom(sp.get("from") ?? ""), [sp]);
  React.useEffect(() => setTo(sp.get("to") ?? ""), [sp]);

  const apply = () => {
    const p = new URLSearchParams(sp.toString());
    from ? p.set("from", from) : p.delete("from");
    to ? p.set("to", to) : p.delete("to");
    const s = p.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    setOpen(false);
  };

  const clear = () => {
    const p = new URLSearchParams(sp.toString());
    p.delete("from");
    p.delete("to");
    const s = p.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    setFrom("");
    setTo("");
    setOpen(false);
  };

  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="inline-flex items-center gap-2">
        <span className="text-[12.5px] text-neutral-700 dark:text-neutral-300">Date</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((v) => !v)}
          className="h-7 px-2 text-[12.5px]"
        >
          Filter
        </Button>
      </div>

      {open && (
        <div
          className={[
            "absolute left-0 top-8 z-50 w-72 rounded-xl border p-3 shadow-md",
            "bg-white/95 border-neutral-200",
            "dark:bg-neutral-900/95 dark:border-neutral-800",
            "backdrop-blur supports-[backdrop-filter]:bg-white/85 dark:supports-[backdrop-filter]:bg-neutral-900/85",
          ].join(" ")}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        >
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[12px]">
              <span className="mb-1 block text-neutral-600 dark:text-neutral-400">From</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className={[
                  "w-full rounded-lg border p-1.5 text-[12.5px] outline-none",
                  "bg-white text-neutral-900 border-neutral-300",
                  "focus:ring",
                  "dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-700",
                ].join(" ")}
              />
            </label>
            <label className="text-[12px]">
              <span className="mb-1 block text-neutral-600 dark:text-neutral-400">To</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className={[
                  "w-full rounded-lg border p-1.5 text-[12.5px] outline-none",
                  "bg-white text-neutral-900 border-neutral-300",
                  "focus:ring",
                  "dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-700",
                ].join(" ")}
              />
            </label>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={clear} className="h-7 px-2 text-[12.5px]">
              Clear
            </Button>
            <Button size="sm" onClick={apply} className="h-7 px-3 text-[12.5px]">
              Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
