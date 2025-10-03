"use client";

import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { OPTIONAL_BY_TAB, REQUIRED, TabKey } from "./constants";

export default function MappingGrid({
  tab,
  mapping,
  setMapping,
  availableHeadersFor,
}: {
  tab: TabKey;
  mapping: Record<string, string>;
  setMapping: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  availableHeadersFor: (field: string) => string[];
}) {
  const fields = [...REQUIRED[tab], ...OPTIONAL_BY_TAB[tab]];

  return (
    <div className="rounded-xl border">
      <div className="border-b p-3 text-sm font-medium">Map columns</div>
      <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2">
        {fields.map((f) => {
          const opts = availableHeadersFor(f);
          const required = REQUIRED[tab].includes(f);
          return (
            <div key={f} className="space-y-1.5">
              <Label className="text-xs">
                {f} {required && <span className="text-red-600">*</span>}
              </Label>
              <Select
                value={mapping[f] ?? ""}
                onValueChange={(v) =>
                  setMapping((m) => {
                    const next: Record<string, string> = { ...m, [f]: v === "__ignore" ? "" : v };
                    if (v !== "__ignore" && v) {
                      for (const k of Object.keys(next)) {
                        if (k !== f && next[k] === v) next[k] = "";
                      }
                    }
                    return next;
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select column…" />
                </SelectTrigger>
                <SelectContent className="z-[70]" position="popper">
                  <SelectItem value="__ignore">— Ignore —</SelectItem>
                  {opts.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
