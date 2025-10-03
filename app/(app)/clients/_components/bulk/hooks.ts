// app/(app)/clients/_components/bulk/hooks.ts
"use client";

import * as React from "react";
import Papa, { ParseResult } from "papaparse";
import {
  ACCEPT,
  ALIASES,
  HELP,
  OPTIONAL_BY_TAB,
  REQUIRED,
  TabKey,
  findHeader,
} from "./constants";

/** Public API from this module */
export function useCsvState() {
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = React.useState<Record<string, string>>({});
  const [createMissingClients, setCreateMissingClients] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fileRef = React.useRef<HTMLInputElement>(null);

  function reset() {
    setFileName(null);
    setHeaders([]);
    setRows([]);
    setMapping({});
    setError(null);
  }

  function autoMapUnique(hdrs: string[], fields: string[], scope: TabKey) {
    const used = new Set<string>();
    const next: Record<string, string> = {};
    for (const f of fields) {
      let guess = "";
      if (f === "amount" && scope === "payments") {
        guess = findHeader(hdrs, ALIASES.amount_payments);
      } else {
        guess = findHeader(hdrs, ALIASES[f] ?? [f]);
      }
      if (guess && !used.has(guess)) {
        next[f] = guess;
        used.add(guess);
      } else {
        next[f] = "";
      }
    }
    return next;
  }

  function parseFile(file: File, scope: TabKey) {
    setError(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
      complete: (res: ParseResult<Record<string, string>>) => {
        const data = (res.data || []).filter((r) =>
          Object.values(r).some((v) => String(v ?? "").trim() !== "")
        );
        const hdrs = (res.meta.fields ?? []).filter(Boolean) as string[];
        setHeaders(hdrs);
        setRows(data);
        setFileName(file.name);

        const fields = [...REQUIRED[scope], ...OPTIONAL_BY_TAB[scope]];
        setMapping(autoMapUnique(hdrs, fields, scope));
      },
      error: (e: { message?: string }) => setError(e?.message || "Parse failed"),
    });
  }

  const usedHeaders = (excludeField?: string) =>
    new Set(
      Object.entries(mapping)
        .filter(([k, v]) => k !== excludeField && v && v !== "__ignore")
        .map(([, v]) => v)
    );

  function availableHeadersFor(field: string) {
    const used = usedHeaders(field);
    return headers.filter((h) => h && (!used.has(h) || mapping[field] === h));
  }

  /** Re-run automapping when tab changes (keeps UX snappy) */
  function remapForTab(scope: TabKey) {
    const fields = [...REQUIRED[scope], ...OPTIONAL_BY_TAB[scope]];
    setMapping((curr) => {
      // keep current selections if they still exist in headers, otherwise try auto-map
      const next: Record<string, string> = {};
      const auto = autoMapUnique(headers, fields, scope);
      for (const f of fields) {
        const v = curr[f];
        next[f] = v && headers.includes(v) ? v : auto[f] || "";
      }
      return next;
    });
  }

  return {
    fileRef,
    fileName,
    headers,
    rows,
    mapping,
    setMapping,
    createMissingClients,
    setCreateMissingClients,
    loading,
    setLoading,
    error,
    setError,
    parseFile,
    reset,
    availableHeadersFor,
    remapForTab,
  };
}

/** ---------- building the POST payload (includes variant_label) ---------- */

export function buildPayloadForSubmit(
  tab: TabKey,
  rows: Record<string, string>[],
  mapping: Record<string, string>,
  createMissingClients: boolean
) {
  const allFields = [...REQUIRED[tab], ...OPTIONAL_BY_TAB[tab]];

  function normalizeValue(f: string, v: string | undefined) {
    const s = String(v ?? "").trim();
    if (!s) return "";

    // numeric fields
    if (["rate", "units", "minutes", "seconds", "amount"].includes(f)) {
      const n = Number(s.replace(/,/g, ""));
      return Number.isFinite(n) ? String(n) : "";
    }
    if (f === "status") return s.toLowerCase();
    if (f === "charged_by" || f === "basis") return s.toLowerCase();
    if (f === "medium") return s || "Other";
    return s;
  }

  function clampSeconds(v: number) {
    if (!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(59, v));
  }

  function computeDurationSeconds(obj: Record<string, string>) {
    const basis = (obj["basis"] || "minute").toLowerCase();
    const mins = Number(obj["minutes"] || 0);
    const secs = clampSeconds(Number(obj["seconds"] || 0));
    if (basis === "second") {
      if (secs > 0) return secs;
      if (mins > 0) return mins; // “minutes” means seconds if basis=second and secs missing
      return 0;
    }
    const total = mins * 60 + secs;
    return Number.isFinite(total) ? total : 0;
  }

  const normalized = rows.map((r) => {
    const obj: Record<string, any> = {};
    for (const f of allFields) {
      const col = mapping[f];
      obj[f] = normalizeValue(f, col ? r[col] : "");
    }

    if (tab === "work") {
      obj.basis = (obj.basis || "minute").toLowerCase();
      obj.status = (obj.status || "delivered").toLowerCase();

      const manualTotal =
        obj.amount !== undefined &&
        obj.amount !== "" &&
        !Number.isNaN(Number(obj.amount));

      if (obj.basis === "project") {
        obj.units = obj.units === "" ? 1 : Number(obj.units);
        delete obj.minutes;
        delete obj.seconds;
      } else {
        const duration = computeDurationSeconds(obj);
        if (!manualTotal) {
          obj.duration_seconds = duration > 0 ? duration : undefined;
        }
      }

      // keep variant label as-is (free text)
      if (!obj.variant_label) obj.variant_label = null;
    }

    if (tab === "payments") {
      if (!obj.medium) obj.medium = "Other";
    }

    return obj;
  });

  return {
    type: tab,
    createMissingClients: tab !== "clients" ? createMissingClients : undefined,
    rows: normalized,
  };
}

/** small helper used by caller for error messages */
export async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null as any;
  }
}
