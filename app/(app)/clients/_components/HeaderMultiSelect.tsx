"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

type Option = { value: string; label: string };

export default function HeaderMultiSelect({
  label,
  param,
  selected,
  options,
}: {
  label: string;
  param: string; // "charged" | "status"
  selected: string[];
  options: Option[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [open, setOpen] = React.useState(false);
  const [local, setLocal] = React.useState<string[]>(selected ?? []);

  React.useEffect(() => setLocal(selected ?? []), [selected]);

  const toggle = (val: string) => {
    setLocal((cur) => (cur.includes(val) ? cur.filter((v) => v !== val) : [...cur, val]));
  };

  const apply = () => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete(param);
    local.forEach((v) => p.append(param, v));
    const s = p.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    setOpen(false);
  };

  const clear = () => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete(param);
    const s = p.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    setLocal([]);
    setOpen(false);
  };

  // close when clicking outside
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
        <span className="text-sm">{label}</span>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
          Filter
        </Button>
      </div>

      {open && (
        <div className="absolute top-9 left-0 z-50 w-56 rounded-xl border bg-white p-3 shadow-md">
          <ul className="space-y-2">
            {options.map((opt) => (
              <li key={opt.value} className="flex items-center gap-2">
                <input
                  id={`${param}-${opt.value}`}
                  type="checkbox"
                  checked={local.includes(opt.value)}
                  onChange={() => toggle(opt.value)}
                  className="h-4 w-4 rounded border-neutral-300"
                />
                <label htmlFor={`${param}-${opt.value}`} className="select-none text-sm">
                  {opt.label}
                </label>
              </li>
            ))}
          </ul>

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
