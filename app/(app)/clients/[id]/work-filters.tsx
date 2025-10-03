"use client";

import React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type WorkFiltersState = {
  status: "all" | "processing" | "delivered";
  basis: "all" | "second" | "minute" | "hour" | "project";
  mode: "all" | "auto" | "manual_rate" | "manual_total";
};

export default function WorkFilters({ current }: { current: WorkFiltersState }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function update(key: keyof WorkFiltersState, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value === "all") params.delete(key);
    else params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`);
  }

  const Box = ({
    label,
    value,
    options,
    onChange,
  }: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (v: string) => void;
  }) => (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-neutral-600">{label}</span>
      <select
        className="rounded-xl border px-2 py-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="flex flex-wrap gap-3">
      <Box
        label="Status"
        value={current.status}
        onChange={(v) => update("status", v)}
        options={[
          { value: "all", label: "All" },
          { value: "processing", label: "Processing" },
          { value: "delivered", label: "Delivered" },
        ]}
      />
      <Box
        label="Basis"
        value={current.basis}
        onChange={(v) => update("basis", v)}
        options={[
          { value: "all", label: "All" },
          { value: "second", label: "Second" },
          { value: "minute", label: "Minute" },
          { value: "hour", label: "Hour" },
          { value: "project", label: "Project" },
        ]}
      />
      <Box
        label="Mode"
        value={current.mode}
        onChange={(v) => update("mode", v)}
        options={[
          { value: "all", label: "All" },
          { value: "auto", label: "Auto" },
          { value: "manual_rate", label: "Manual rate" },
          { value: "manual_total", label: "Manual total" },
        ]}
      />
    </div>
  );
}
