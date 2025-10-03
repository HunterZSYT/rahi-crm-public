"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/* pieces */
import FilePicker from "./bulk/FilePicker";
import MappingGrid from "./bulk/MappingGrid";
import PreviewTable from "./bulk/PreviewTable";
import FooterBar from "./bulk/FooterBar";

/* logic & constants */
import {
  HELP_TEXT as HELP,
  OPTIONAL_BY_TAB,
  REQUIRED,
  type TabKey,
  SAMPLE_CSV,
  fileNameFor,
  downloadBlob,
} from "./bulk/constants";
import { buildPayloadForSubmit, safeJson, useCsvState } from "./bulk/hooks";

export default function BulkUpload() {
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<TabKey>("clients");

  const {
    fileName,
    headers,
    rows,
    mapping,
    setMapping,
    createMissingClients,
    setCreateMissingClients,
    error,
    setError,
    loading,
    setLoading,
    parseFile,
    reset,
    availableHeadersFor,
    remapForTab,
  } = useCsvState();

  const router = useRouter();

  // Re-run auto-mapping whenever the active tab changes
  React.useEffect(() => {
    remapForTab(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const required = REQUIRED[tab];
  const optional = OPTIONAL_BY_TAB[tab];
  const missingRequired = required.filter((f) => !mapping[f]);
  const valid = rows.length > 0 && missingRequired.length === 0;

  async function submit() {
    try {
      setLoading(true);
      setError(null);
      const payload = buildPayloadForSubmit(tab, rows, mapping, createMissingClients);
      const res = await fetch("/api/clients/bulk-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await safeJson(res);
        throw new Error(j?.error || `Import failed (${res.status})`);
      }
      router.refresh();
      setOpen(false);
      reset();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">Bulk upload</Button>
      </DialogTrigger>

      <DialogContent className="w-[95vw] sm:max-w-[1100px] p-0">
        <div className="grid max-h-[85vh] grid-rows-[auto,1fr,auto]">
          <DialogHeader className="px-5 pt-5">
            <DialogTitle>Bulk upload</DialogTitle>
            <DialogDescription>
              Import clients, work and payments from CSV. Map your columns, preview, and import.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto px-5">
            <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="mt-3">
              <div className="mb-3 flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="clients">Clients</TabsTrigger>
                  <TabsTrigger value="work">Work</TabsTrigger>
                  <TabsTrigger value="payments">Payments</TabsTrigger>
                </TabsList>

                <Button
                  variant="secondary"
                  type="button"
                  onClick={() =>
                    downloadBlob(
                      SAMPLE_CSV[tab],
                      `${fileNameFor(tab).replace(".csv", "")}-${new Date()
                        .toISOString()
                        .slice(0, 10)}.csv`
                    )
                  }
                >
                  Download sample
                </Button>
              </div>

              {(["clients", "work", "payments"] as TabKey[]).map((key) => (
                <TabsContent key={key} value={key} className="space-y-4">
                  <p className="text-sm text-neutral-600">{HELP[key]}</p>

                  {/* CSV chooser / dropzone */}
                  <FilePicker fileName={fileName} onChoose={(f) => parseFile(f, key)} />

                  {/* Auto-create toggle for work & payments */}
                  {key !== "clients" && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`mkc-${key}`}
                        checked={createMissingClients}
                        onCheckedChange={(v) => setCreateMissingClients(Boolean(v))}
                      />
                      <Label htmlFor={`mkc-${key}`} className="text-sm">
                        Create clients automatically if a row references a missing client
                      </Label>
                    </div>
                  )}

                  {/* Mapping */}
                  {headers.length > 0 && (
                    <MappingGrid
                      tab={key}
                      mapping={mapping}
                      setMapping={setMapping}
                      availableHeadersFor={availableHeadersFor}
                    />
                  )}

                  {/* Preview */}
                  {rows.length > 0 && (
                    <PreviewTable headers={headers} rows={rows} missingRequired={missingRequired} />
                  )}

                  {/* Per-tab error */}
                  {error ? (
                    <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {error}
                    </div>
                  ) : null}
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* sticky footer */}
          <FooterBar
            onCancel={() => {
              setOpen(false);
              reset();
            }}
            onSubmit={submit}
            disabled={!valid || loading}
            count={rows.length}
            loading={loading}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
