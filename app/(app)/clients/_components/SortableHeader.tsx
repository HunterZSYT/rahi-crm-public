"use client";

import * as React from "react";
import { ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";

export default function SortableHeader({
  label,
  active,
  dir,
  onToggle,
}: {
  label: string;
  active?: boolean;
  dir?: "asc" | "desc";
  onToggle: () => void;
}) {
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ChevronUp : ChevronDown;

  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex select-none items-center gap-1 rounded px-1 py-0.5 text-left text-sm hover:bg-neutral-100"
      title={active ? `Sorted ${dir}` : "Click to sort"}
    >
      <span>{label}</span>
      <Icon className="h-4 w-4 opacity-70" />
    </button>
  );
}
