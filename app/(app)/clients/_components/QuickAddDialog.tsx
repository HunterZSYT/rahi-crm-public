"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Reuse your existing Add Work modal (already a portal)
import AddWork from "../[id]/add-work";

type ClientLite = {
  id: string;
  name: string;
  charged_by?: "second" | "minute" | "hour" | "project";
  rate?: number;
};

type ClientBasics = {
  charged_by: "second" | "minute" | "hour" | "project";
  rate: number;
};

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function QuickAddDialog() {
  const [open, setOpen] = React.useState(false);

  // which panel
  const [mode, setMode] = React.useState<"work" | "payment">("work");

  // clients + selected
  const [clients, setClients] = React.useState<ClientLite[]>([]);
  const [clientId, setClientId] = React.useState<string>("");

  // basics for AddWork
  const [basics, setBasics] = React.useState<ClientBasics | null>(null);
  const [loadingBasics, setLoadingBasics] = React.useState(false);

  // payment form
  const [pDate, setPDate] = React.useState(todayISO());
  const [pAmount, setPAmount] = React.useState<number | "">("");
  const [pMedium, setPMedium] = React.useState("bkash");
  const [pNote, setPNote] = React.useState("");
  const [savingPay, setSavingPay] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  // mount guard for safe portal usage
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // fetch clients when dialog opens
  React.useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await fetch("/api/invoice/clients", { cache: "no-store" });
        const j = await res.json();
        setClients(j?.clients ?? []);
      } catch {
        setClients([]);
      }
    })();
  }, [open]);

  // load charged_by + rate once a client is chosen (for AddWork)
  React.useEffect(() => {
    setBasics(null);
    if (!clientId || mode !== "work") return;
    (async () => {
      setLoadingBasics(true);
      try {
        const r = await fetch(
          `/api/clients/basic?id=${encodeURIComponent(clientId)}`,
          { cache: "no-store" }
        );
        const j = await r.json();
        if (r.ok && j?.charged_by && j?.rate != null) {
          setBasics({ charged_by: j.charged_by, rate: Number(j.rate) });
        } else {
          throw new Error(j?.error || "Failed to load client rate");
        }
      } catch (e: any) {
        setErr(e?.message || "Could not load client configuration");
      } finally {
        setLoadingBasics(false);
      }
    })();
  }, [clientId, mode]);

  // save payment
  async function savePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId || pAmount === "" || Number(pAmount) <= 0) return;
    setSavingPay(true);
    setErr(null);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          date: pDate,
          amount: Number(pAmount),
          medium: pMedium,
          note: pNote.trim() || null,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Failed to add payment");
      // reset + close
      setOpen(false);
      setPAmount("");
      setPNote("");
    } catch (e: any) {
      setErr(e?.message || "Failed to save payment");
    } finally {
      setSavingPay(false);
    }
  }

  // After “Add work” is chosen & basics loaded, close this and launch AddWork
  const [launchWork, setLaunchWork] = React.useState<null | {
    clientId: string;
    charged_by: ClientBasics["charged_by"];
    rate: number;
  }>(null);

  function startWorkFlow() {
    if (!clientId || !basics) return;
    setOpen(false);
    setLaunchWork({
      clientId,
      charged_by: basics.charged_by,
      rate: basics.rate,
    });
  }

  // close on ESC
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Quick add
      </Button>

      {/* launcher for your existing AddWork portal */}
      {launchWork && (
        <AddWork
          clientId={launchWork.clientId}
          defaultBasis={launchWork.charged_by}
          defaultRate={launchWork.rate}
          open
          onClose={() => setLaunchWork(null)}
        />
      )}

      {/* The portal prevents any transform/overflow parent from clipping this */}
      {mounted &&
        open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-4"
            aria-modal="true"
            role="dialog"
            onMouseDown={() => setOpen(false)}
          >
            <div
              className="w-full max-w-3xl rounded-2xl bg-white text-neutral-900 shadow-2xl ring-1 ring-black/5
                         dark:bg-neutral-900 dark:text-neutral-100 dark:ring-white/10"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b px-5 py-3 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <button
                    className={`rounded-xl px-3 py-1.5 text-sm transition-colors ${
                      mode === "work"
                        ? "bg-black text-white dark:bg-white dark:text-black"
                        : "border dark:border-white/15"
                    }`}
                    onClick={() => setMode("work")}
                  >
                    Add work
                  </button>
                  <button
                    className={`rounded-xl px-3 py-1.5 text-sm transition-colors ${
                      mode === "payment"
                        ? "bg-black text-white dark:bg-white dark:text-black"
                        : "border dark:border-white/15"
                    }`}
                    onClick={() => setMode("payment")}
                  >
                    Add payment
                  </button>
                </div>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4 px-5 py-4">
                <div>
                  <Label className="text-xs text-neutral-600 dark:text-neutral-300">
                    Client
                  </Label>
                  <select
                    className="mt-1 w-full rounded-xl border p-2 outline-none
                               dark:border-white/15 dark:bg-neutral-800 dark:text-neutral-100"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                  >
                    <option value="">Select client…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {mode === "work" ? (
                  <div className="rounded-xl border p-4 dark:border-white/15">
                    {!clientId ? (
                      <p className="text-sm text-neutral-600 dark:text-neutral-300">
                        Pick a client to continue.
                      </p>
                    ) : loadingBasics ? (
                      <p className="text-sm text-neutral-600 dark:text-neutral-300">
                        Loading client rate…
                      </p>
                    ) : basics ? (
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="text-sm text-neutral-700 dark:text-neutral-200">
                          Basis: <b>{basics.charged_by}</b> • Default rate:{" "}
                          <b>{basics.rate}</b>
                        </div>
                        <Button onClick={startWorkFlow}>
                          Continue to Add work
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {err || "Could not load client configuration"}
                      </p>
                    )}
                  </div>
                ) : (
                  <form
                    onSubmit={savePayment}
                    className="space-y-3 rounded-xl border p-4 dark:border-white/15"
                  >
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <label className="block text-sm">
                        <span className="mb-1 block text-neutral-700 dark:text-neutral-300">
                          Date
                        </span>
                        <Input
                          type="date"
                          value={pDate}
                          onChange={(e) => setPDate(e.target.value)}
                          className="dark:border-white/15 dark:bg-neutral-800 dark:text-neutral-100"
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 block text-neutral-700 dark:text-neutral-300">
                          Amount
                        </span>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={pAmount}
                          onChange={(e) =>
                            setPAmount(
                              e.target.value === "" ? "" : Number(e.target.value)
                            )
                          }
                          className="dark:border-white/15 dark:bg-neutral-800 dark:text-neutral-100"
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 block text-neutral-700 dark:text-neutral-300">
                          Medium
                        </span>
                        <select
                          className="w-full rounded-xl border p-2 outline-none
                                     dark:border-white/15 dark:bg-neutral-800 dark:text-neutral-100"
                          value={pMedium}
                          onChange={(e) => setPMedium(e.target.value)}
                        >
                          <option value="bkash">bkash</option>
                          <option value="nagad">nagad</option>
                          <option value="rocket">rocket</option>
                          <option value="bank">bank</option>
                          <option value="other">other</option>
                        </select>
                      </label>
                    </div>

                    <label className="block text-sm">
                      <span className="mb-1 block text-neutral-700 dark:text-neutral-300">
                        Note (optional)
                      </span>
                      <textarea
                        className="w-full rounded-xl border p-2 outline-none
                                   dark:border-white/15 dark:bg-neutral-800 dark:text-neutral-100"
                        rows={3}
                        value={pNote}
                        onChange={(e) => setPNote(e.target.value)}
                      />
                    </label>

                    {err && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {err}
                      </p>
                    )}

                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={
                          !clientId || pAmount === "" || Number(pAmount) <= 0 || savingPay
                        }
                      >
                        {savingPay ? "Saving…" : "Save payment"}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
