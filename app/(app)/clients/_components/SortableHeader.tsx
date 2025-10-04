"use client";

import * as React from "react";
import { ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";

type Props = {
  label: string;
  active?: boolean;
  dir?: "asc" | "desc";
  onToggle?: () => void;
  className?: string;
};

export default function SortableHeader({
  label,
  active = false,
  dir = "asc",
  onToggle,
  className = "",
}: Props) {
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ChevronUp : ChevronDown;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        "inline-flex items-center gap-1 rounded-lg px-2 py-1",
        "text-[12.5px] font-medium",
        "text-neutral-700 hover:bg-neutral-100 focus:outline-none focus:ring",
        "dark:text-neutral-200 dark:hover:bg-neutral-800 dark:focus:ring-neutral-700",
        "transition-[background-color,box-shadow]",
        className,
      ].join(" ")}
      aria-pressed={active}
    >
      {label && <span>{label}</span>}
      <Icon className="h-3.5 w-3.5 opacity-80" />
    </button>
  );
}
