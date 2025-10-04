"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// we’ll reuse your existing Add Work modal component
// (it already knows how to render itself as a portal + save rows)
import AddWork from "../[id]/add-work";  // reuses your file

type ClientLite = {
  id: string;
  name: string;
  // these two are needed for AddWork defaults; fetched per-client
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

  // when dialog opens, fetch simple client list
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
        const r = await fetch(`/api/clients/basic?id=${encodeURIComponent(clientId)}`, { cache: "no-store" });
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

  // After “Add work” is chosen & basics loaded, we close this dialog
  // and immediately show your existing AddWork modal.
  const [launchWork, setLaunchWork] = React.useState<null | {
    clientId: string; charged_by: ClientBasics["charged_by"]; rate: number;
  }>(null);

  function startWorkFlow() {
    if (!clientId || !basics) return;
    setOpen(false);
    setLaunchWork({ clientId, charged_by: basics.charged_by, rate: basics.rate });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>Quick add</Button>

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

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onMouseDown={() => setOpen(false)}
        >
          <div
            className="w-full max-w-3xl rounded-2xl bg-white shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-3">
              <div className="flex items-center gap-2">
                <button
                  className={`rounded-xl px-3 py-1.5 text-sm ${mode === "work" ? "bg-black text-white" : "border"}`}
                  onClick={() => setMode("work")}
                >
                  Add work
                </button>
                <button
                  className={`rounded-xl px-3 py-1.5 text-sm ${mode === "payment" ? "bg-black text-white" : "border"}`}
                  onClick={() => setMode("payment")}
                >
                  Add payment
                </button>
              </div>
              <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            </div>

            <div className="grid grid-cols-1 gap-4 px-5 py-4">
              <div>
                <Label className="text-xs">Client</Label>
                <select
                  className="mt-1 w-full rounded-xl border p-2 outline-none"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                >
                  <option value="">Select client…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {mode === "work" ? (
                <div className="rounded-xl border p-4">
                  {!clientId ? (
                    <p className="text-sm text-neutral-600">Pick a client to continue.</p>
                  ) : loadingBasics ? (
                    <p className="text-sm text-neutral-600">Loading client rate…</p>
                  ) : basics ? (
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-neutral-700">
                        Basis: <b>{basics.charged_by}</b> • Default rate: <b>{basics.rate}</b>
                      </div>
                      <Button onClick={startWorkFlow}>Continue to Add work</Button>
                    </div>
                  ) : (
                    <p className="text-sm text-red-600">{err || "Could not load client configuration"}</p>
                  )}
                </div>
              ) : (
                <form onSubmit={savePayment} className="space-y-3 rounded-xl border p-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <label className="block text-sm">
                      <span className="mb-1 block">Date</span>
                      <Input type="date" value={pDate} onChange={(e) => setPDate(e.target.value)} />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block">Amount</span>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={pAmount}
                        onChange={(e) => setPAmount(e.target.value === "" ? "" : Number(e.target.value))}
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block">Medium</span>
                      <select
                        className="w-full rounded-xl border p-2 outline-none"
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
                    <span className="mb-1 block">Note (optional)</span>
                    <textarea
                      className="w-full rounded-xl border p-2 outline-none"
                      rows={3}
                      value={pNote}
                      onChange={(e) => setPNote(e.target.value)}
                    />
                  </label>

                  {err && <p className="text-sm text-red-600">{err}</p>}

                  <div className="flex items-center justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={!clientId || pAmount === "" || Number(pAmount) <= 0 || savingPay}>
                      {savingPay ? "Saving…" : "Save payment"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
