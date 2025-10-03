"use client";

import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function PreviewTable({
  headers,
  rows,
  missingRequired,
}: {
  headers: string[];
  rows: Record<string, string>[];
  missingRequired: string[];
}) {
  return (
    <div className="rounded-xl border">
      <div className="flex items-center justify-between border-b p-3">
        <div className="text-sm font-medium">
          Preview <span className="text-neutral-500">({rows.length} rows)</span>
        </div>
        {missingRequired.length > 0 ? (
          <div className="text-xs text-red-600">Map required: {missingRequired.join(", ")}</div>
        ) : null}
      </div>

      <ScrollArea className="h-56 w-full">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-neutral-50">
            <tr>
              {headers.map((h) => (
                <th key={h} className="px-3 py-2 text-left font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 100).map((r, i) => (
              <tr key={i} className="border-t">
                {headers.map((h) => (
                  <td key={h} className="px-3 py-1.5">
                    {String(r[h] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  );
}
