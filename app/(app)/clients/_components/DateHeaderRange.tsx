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
    if (from) p.set("from", from);
    else p.delete("from");
    if (to) p.set("to", to);
    else p.delete("to");
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
        <span className="text-sm">Date</span>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
          Filter
        </Button>
      </div>

      {open && (
        <div className="absolute top-9 left-0 z-50 w-72 rounded-xl border bg-white p-3 shadow-md">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs">
              <span className="mb-1 block text-neutral-600">From</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-lg border p-1 text-sm outline-none"
              />
            </label>
            <label className="text-xs">
              <span className="mb-1 block text-neutral-600">To</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-lg border p-1 text-sm outline-none"
              />
            </label>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={clear}>
              Clear
            </Button>
            <Button size="sm" onClick={apply}>
              Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
