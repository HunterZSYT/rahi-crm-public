"use client";

import { ReactNode } from "react";

export default function MiniTable({
  headers,
  rows,
  empty = "No data",
  rightAlign = [],
}: {
  headers: string[];
  rows: (ReactNode | string)[][];
  empty?: string;
  rightAlign?: number[]; // column indexes to right align
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead className="sticky top-0 z-0 bg-neutral-50/90 backdrop-blur supports-[backdrop-filter]:bg-neutral-50/70 dark:bg-neutral-900/70 dark:supports-[backdrop-filter]:bg-neutral-900/60">
          <tr className="border-b border-neutral-200 dark:border-neutral-800">
            {headers.map((h, i) => (
              <th
                key={i}
                className={[
                  "px-3 py-2 text-left text-[11.5px] uppercase tracking-wide",
                  "text-neutral-500 dark:text-neutral-400",
                  rightAlign.includes(i) ? "text-right" : "text-left",
                ].join(" ")}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={headers.length}
                className="px-3 py-6 text-center text-neutral-500 dark:text-neutral-400"
              >
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((r, ri) => (
              <tr
                key={ri}
                className="border-b border-neutral-200 last:border-b-0 dark:border-neutral-800 hover:bg-neutral-50/60 dark:hover:bg-white/[0.04] transition-colors"
              >
                {r.map((c, ci) => (
                  <td
                    key={ci}
                    className={[
                      "px-3 py-2",
                      rightAlign.includes(ci) ? "text-right" : "text-left",
                      "text-neutral-800 dark:text-neutral-200",
                    ].join(" ")}
                  >
                    {c}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
