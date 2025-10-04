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

  const toggle = (val: string) =>
    setLocal((cur) => (cur.includes(val) ? cur.filter((v) => v !== val) : [...cur, val]));

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
        <span className="text-[12.5px] text-neutral-700 dark:text-neutral-300">{label}</span>
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
            "absolute left-0 top-8 z-50 w-56 rounded-xl border p-3 shadow-md",
            "bg-white/95 border-neutral-200",
            "dark:bg-neutral-900/95 dark:border-neutral-800",
            "backdrop-blur supports-[backdrop-filter]:bg-white/85 dark:supports-[backdrop-filter]:bg-neutral-900/85",
          ].join(" ")}
        >
          <ul className="space-y-2">
            {options.map((opt) => (
              <li key={opt.value} className="flex items-center gap-2">
                <input
                  id={`${param}-${opt.value}`}
                  type="checkbox"
                  checked={local.includes(opt.value)}
                  onChange={() => toggle(opt.value)}
                  className={[
                    "h-4 w-4 rounded border-neutral-300 text-indigo-600",
                    "dark:border-neutral-700 dark:bg-neutral-800",
                  ].join(" ")}
                />
                <label
                  htmlFor={`${param}-${opt.value}`}
                  className="select-none text-[12.5px] text-neutral-800 dark:text-neutral-200"
                >
                  {opt.label}
                </label>
              </li>
            ))}
          </ul>

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
