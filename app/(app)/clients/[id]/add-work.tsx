"use client";

import React, {
  cloneElement,
  isValidElement,
  MouseEvent as ReactMouseEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

/* --------------------------------- types --------------------------------- */
type Basis = "second" | "minute" | "hour" | "project";
type PricingMode = "auto" | "manual_rate" | "manual_total";

export type WorkInitial = {
  id?: string;
  date?: string;
  project_name?: string;
  charged_by_snapshot?: Basis | null;
  pricing_mode?: PricingMode;
  duration_seconds?: number | null;
  units?: number | null;
  rate_snapshot?: number | null;
  amount_due?: number | null;
  override_reason?: string | null;
  delivered_at?: string | null;
  note?: string | null;
  /** NEW: optional variant label saved on the row */
  variant_label?: string | null;
};

type Props = {
  clientId: string;
  defaultBasis: Basis; // client's charged_by
  defaultRate: number; // client's rate
  initial?: WorkInitial;
  trigger?: React.ReactElement<{ onClick?: (e: ReactMouseEvent) => void }>;
  open?: boolean;
  onClose?: () => void;
};

/* --------------------------- helpers & formatting ------------------------- */
function clampSeconds(v: number) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(59, v));
}

function calcUnitsFromDuration(basis: Basis, minutes: number, seconds: number) {
  const s = minutes * 60 + clampSeconds(seconds);
  switch (basis) {
    case "second":
      return s;
    case "minute":
      return s / 60;
    case "hour":
      return s / 3600;
    case "project":
      return 0;
  }
}

function toBDT(n: number) {
  return n.toLocaleString("en-BD", { maximumFractionDigits: 2 });
}
const todayISO = () => new Date().toISOString().slice(0, 10);

/* ----------------------------- variant model ----------------------------- */
type Variant = {
  label: string;
  basis: Basis;
  minutes: string;
  seconds: string;
  projectUnits: number;
  pricingMode: PricingMode;
  customRate: number | "";
  manualTotal: number | "";
  overrideReason: string;
};

function makeVariant(idx: number, basis: Basis): Variant {
  return {
    label: `Variant ${idx + 1}`,
    basis,
    minutes: "",
    seconds: "",
    projectUnits: 1,
    pricingMode: "auto",
    customRate: "",
    manualTotal: "",
    overrideReason: "",
  };
}

function variantFinalTotal(v: Variant, clientRate: number) {
  if (v.pricingMode === "manual_total") {
    return Number(v.manualTotal || 0);
  }
  const rate =
    v.pricingMode === "auto" ? Number(clientRate || 0) : Number(v.customRate || 0);

  if (v.basis === "project") {
    const u = Math.max(1, Number(v.projectUnits || 1));
    return u * rate;
  }
  const mins = Number(v.minutes || 0);
  const secs = Number(v.seconds || 0);
  const units = calcUnitsFromDuration(v.basis, mins, secs) || 0;
  return units * rate;
}

/* -------------------------------- component ------------------------------- */
export default function AddWork({
  clientId,
  defaultBasis,
  defaultRate,
  initial,
  trigger,
  open,
  onClose,
}: Props) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);

  const [internalOpen, setInternalOpen] = useState(false);
  const modalOpen = open ?? internalOpen;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // shared
  const [date, setDate] = useState<string>("");
  const [project, setProject] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [markDelivered, setMarkDelivered] = useState<boolean>(true);

  // single-entry (edit) fields
  const [singleBasis, setSingleBasis] = useState<Basis>(defaultBasis);
  const [singlePricing, setSinglePricing] = useState<PricingMode>("auto");
  const [singleMin, setSingleMin] = useState<string>("");
  const [singleSec, setSingleSec] = useState<string>("");
  const [singleUnits, setSingleUnits] = useState<number>(1);
  const [singleRate, setSingleRate] = useState<number | "">("");
  const [singleTotal, setSingleTotal] = useState<number | "">("");
  const [singleReason, setSingleReason] = useState<string>("");
  /** NEW: editable label on edit */
  const [singleVariantLabel, setSingleVariantLabel] = useState<string>("");

  // variants (create)
  const [variantCount, setVariantCount] = useState<number>(1);
  const [variants, setVariants] = useState<Variant[]>([makeVariant(0, defaultBasis)]);

  // error/saving
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /* ------------------------------- hydrate UI ------------------------------ */
  useEffect(() => {
    if (!modalOpen) return;

    if (isEdit && initial) {
      setVariantCount(1);
      setVariants([makeVariant(0, defaultBasis)]);

      setDate((initial.date ?? "").slice(0, 10) || todayISO());
      setProject(initial.project_name ?? "");
      setSingleBasis((initial.charged_by_snapshot as Basis) ?? defaultBasis);
      setSinglePricing(initial.pricing_mode ?? "auto");

      const secs = initial.duration_seconds ?? null;
      if (secs != null) {
        setSingleMin(String(Math.floor(secs / 60)));
        setSingleSec(String(secs % 60));
      } else {
        setSingleMin("");
        setSingleSec("");
      }
      setSingleUnits(initial.units != null && initial.units > 0 ? Number(initial.units) : 1);
      setSingleRate(initial.rate_snapshot != null ? Number(initial.rate_snapshot) : "");
      setSingleTotal(
        initial.amount_due != null && initial.pricing_mode === "manual_total"
          ? Number(initial.amount_due)
          : ""
      );
      setSingleReason(initial.override_reason ?? "");
      setSingleVariantLabel(initial.variant_label ?? ""); // NEW
      setNote(initial.note ?? "");
      setMarkDelivered(Boolean(initial.delivered_at));
      setErr(null);
      return;
    }

    // new
    setDate(todayISO());
    setProject("");
    setNote("");
    setMarkDelivered(true);

    setSingleBasis(defaultBasis);
    setSinglePricing("auto");
    setSingleMin("");
    setSingleSec("");
    setSingleUnits(1);
    setSingleRate("");
    setSingleTotal("");
    setSingleReason("");
    setSingleVariantLabel(""); // NEW

    setVariantCount(1);
    setVariants([makeVariant(0, defaultBasis)]);
    setErr(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen]);

  /* ---------------------------- derived (single) --------------------------- */
  const singlePreview = useMemo(() => {
    if (singlePricing === "manual_total") return Number(singleTotal || 0);
    const rate = singlePricing === "auto" ? Number(defaultRate || 0) : Number(singleRate || 0);

    if (singleBasis === "project") {
      return Math.max(0, Math.max(1, Number(singleUnits || 1)) * rate);
    }
    const mins = Number(singleMin || 0);
    const secs = Number(singleSec || 0);
    const units = calcUnitsFromDuration(singleBasis, mins, secs) || 0;
    return Math.max(0, units * rate);
  }, [singlePricing, singleTotal, singleRate, defaultRate, singleBasis, singleUnits, singleMin, singleSec]);

  /* -------------------------- variants list helpers ------------------------ */
  function ensureVariantCount(n: number) {
    const num = Math.max(1, Math.min(50, Math.floor(n || 1)));
    setVariantCount(num);
    setVariants((prev) => {
      const copy = [...prev];
      if (num > copy.length) {
        for (let i = copy.length; i < num; i++) copy.push(makeVariant(i, defaultBasis));
      } else if (num < copy.length) {
        copy.length = num;
      }
      return copy.map((v, i) => ({ ...v, label: v.label || `Variant ${i + 1}` }));
    });
  }

  /* -------------------------------- submit -------------------------------- */
  const openModal = () => { if (open == null) setInternalOpen(true); };
  const closeModal = () => { onClose?.(); if (open == null) setInternalOpen(false); };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);

    try {
      if (isEdit && initial?.id) {
        // EDIT: single row
        const mins = Number(singleMin || 0);
        const secs = clampSeconds(Number(singleSec || 0));
        const duration_seconds = singleBasis === "project" ? null : mins * 60 + secs;

        const units =
          singleBasis === "project"
            ? Math.max(1, Number(singleUnits || 1))
            : singleBasis === "second"
            ? mins * 60 + secs
            : singleBasis === "minute"
            ? (mins * 60 + secs) / 60
            : (mins * 60 + secs) / 3600;

        const payload = {
          date,
          project_name: project || "",
          charged_by_snapshot: singleBasis,
          pricing_mode: singlePricing,
          duration_seconds,
          units,
          rate_snapshot:
            singlePricing === "manual_total"
              ? null
              : singlePricing === "auto"
              ? Number(defaultRate || 0)
              : singleRate === ""
              ? null
              : Number(singleRate),
          amount_due:
            singlePricing === "manual_total" ? Number(singleTotal || 0) : singlePreview,
          override_reason: singlePricing === "auto" ? null : singleReason || null,
          note: note || null,
          delivered_at: markDelivered ? new Date().toISOString() : null,
          /** NEW: send label on edit as well */
          variant_label: singleVariantLabel || null,
        };

        const res = await fetch(`/api/work/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error || "Failed to save");
      } else {
        // CREATE: 1..N rows
        const toCreate = variantCount === 1 ? [variants[0]] : variants;

        let failed: string[] = [];
        for (let i = 0; i < toCreate.length; i++) {
          const v = toCreate[i];
          const mins = Number(v.minutes || 0);
          const secs = clampSeconds(Number(v.seconds || 0));
          const duration_seconds = v.basis === "project" ? null : mins * 60 + secs;
          const units =
            v.basis === "project"
              ? Math.max(1, Number(v.projectUnits || 1))
              : v.basis === "second"
              ? mins * 60 + secs
              : v.basis === "minute"
              ? (mins * 60 + secs) / 60
              : (mins * 60 + secs) / 3600;

          const finalTotal = variantFinalTotal(v, defaultRate);

          const payload = {
            date,
            project_name: project || "",
            charged_by_snapshot: v.basis,
            pricing_mode: v.pricingMode,
            duration_seconds,
            units,
            rate_snapshot:
              v.pricingMode === "manual_total"
                ? null
                : v.pricingMode === "auto"
                ? Number(defaultRate || 0)
                : v.customRate === ""
                ? null
                : Number(v.customRate),
            amount_due: v.pricingMode === "manual_total" ? Number(v.manualTotal || 0) : finalTotal,
            override_reason: v.pricingMode === "auto" ? null : v.overrideReason || null,
            note: note || null,
            delivered_at: markDelivered ? new Date().toISOString() : null,
            /** NEW: store per-variant label */
            variant_label: v.label || null,
          };

          const res = await fetch(`/api/clients/${clientId}/work`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            let reason = `Variant ${i + 1}`;
            try {
              const j = await res.json();
              if (j?.error) reason += `: ${j.error}`;
            } catch {}
            failed.push(reason);
          }
        }
        if (failed.length) throw new Error(`Some variants failed: ${failed.join(", ")}`);
      }

      closeModal();
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!isEdit || !initial?.id) return;
    if (!confirm("Delete this work entry? This cannot be undone.")) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/work/${initial.id}`, { method: "DELETE" });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Failed to delete");
      closeModal();
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------ render modal ----------------------------- */
  const modal =
    mounted && modalOpen
      ? createPortal(
          <Modal title={isEdit ? "Edit work entry" : "Add work entry"} onClose={closeModal}>
            <WorkForm
              isEdit={isEdit}
              date={date}
              setDate={setDate}
              project={project}
              setProject={setProject}
              note={note}
              setNote={setNote}
              markDelivered={markDelivered}
              setMarkDelivered={setMarkDelivered}
              defaultRate={defaultRate}
              // single (edit)
              singleBasis={singleBasis}
              setSingleBasis={setSingleBasis}
              singlePricing={singlePricing}
              setSinglePricing={setSinglePricing}
              singleMin={singleMin}
              setSingleMin={setSingleMin}
              singleSec={singleSec}
              setSingleSec={setSingleSec}
              singleUnits={singleUnits}
              setSingleUnits={setSingleUnits}
              singleRate={singleRate}
              setSingleRate={setSingleRate}
              singleTotal={singleTotal}
              setSingleTotal={setSingleTotal}
              singleReason={singleReason}
              setSingleReason={setSingleReason}
              singlePreview={singlePreview}
              singleVariantLabel={singleVariantLabel}
              setSingleVariantLabel={setSingleVariantLabel}
              // variants (create)
              variantCount={variantCount}
              ensureVariantCount={ensureVariantCount}
              variants={variants}
              setVariants={setVariants}
              err={err}
              saving={saving}
              onSubmit={onSubmit}
              onDelete={onDelete}
              onCancel={closeModal}
            />
          </Modal>,
          document.body
        )
      : null;

  if (trigger && isValidElement(trigger)) {
    const wrapped = cloneElement(trigger, {
      onClick: (e: ReactMouseEvent) => {
        trigger.props?.onClick?.(e);
        openModal();
      },
    });
    return (
      <>
        {wrapped}
        {modal}
      </>
    );
  }

  return (
    <>
      <button className="rounded-xl border px-3 py-1.5" onClick={openModal}>
        {isEdit ? "Edit entry" : "Add entry"}
      </button>
      {modal}
    </>
  );
}

/* -------------------------------- subviews -------------------------------- */
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overscroll-contain"
      role="dialog"
      aria-modal="true"
    >
      {/* overflow-hidden keeps header fixed while body scrolls */}
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Sticky-ish header (remains visible while content scrolls) */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-medium">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-xl border px-3 py-1 text-sm"
          >
            Close
          </button>
        </div>

        {/* The content area that can scroll independently */}
        <div className="max-h-[80vh] overflow-y-auto px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}


function WorkForm(props: {
  isEdit: boolean;
  date: string;
  setDate: (v: string) => void;
  project: string;
  setProject: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  markDelivered: boolean;
  setMarkDelivered: (v: boolean) => void;
  defaultRate: number;

  // single (edit)
  singleBasis: Basis;
  setSingleBasis: (b: Basis) => void;
  singlePricing: PricingMode;
  setSinglePricing: (p: PricingMode) => void;
  singleMin: string;
  setSingleMin: (v: string) => void;
  singleSec: string;
  setSingleSec: (v: string) => void;
  singleUnits: number;
  setSingleUnits: (n: number) => void;
  singleRate: number | "";
  setSingleRate: (v: number | "") => void;
  singleTotal: number | "";
  setSingleTotal: (v: number | "") => void;
  singleReason: string;
  setSingleReason: (v: string) => void;
  singlePreview: number;
  singleVariantLabel: string; // NEW
  setSingleVariantLabel: (v: string) => void; // NEW

  // variants (create)
  variantCount: number;
  ensureVariantCount: (n: number) => void;
  variants: Variant[];
  setVariants: React.Dispatch<React.SetStateAction<Variant[]>>;

  err: string | null;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const {
    isEdit,
    date,
    setDate,
    project,
    setProject,
    note,
    setNote,
    markDelivered,
    setMarkDelivered,
    defaultRate,
    // single
    singleBasis, setSingleBasis,
    singlePricing, setSinglePricing,
    singleMin, setSingleMin,
    singleSec, setSingleSec,
    singleUnits, setSingleUnits,
    singleRate, setSingleRate,
    singleTotal, setSingleTotal,
    singleReason, setSingleReason,
    singlePreview,
    singleVariantLabel, setSingleVariantLabel,
    // variants
    variantCount, ensureVariantCount, variants, setVariants,
    err, saving, onSubmit, onDelete, onCancel,
  } = props;

  const onNumOnly = (v: string) => v === "" || /^[0-9]+$/.test(v);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border p-2 outline-none focus:ring"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm">Project</label>
          <input
            value={project}
            onChange={(e) => setProject(e.target.value)}
            className="w-full rounded-xl border p-2 outline-none focus:ring"
            placeholder="Project name"
          />
        </div>
      </div>

      {!isEdit ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm">Project variants (count)</label>
              <input
                type="number"
                min={1}
                max={50}
                value={variantCount}
                onChange={(e) => ensureVariantCount(Number(e.target.value || 1))}
                className="w-full rounded-xl border p-2 outline-none focus:ring"
              />
            </div>
          </div>

          <div className="space-y-6">
            {variants.map((v, idx) => {
              const final = variantFinalTotal(v, defaultRate);
              return (
                <div key={idx} className="rounded-2xl border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                      <input
                        className="rounded-xl border px-3 py-1.5"
                        value={v.label}
                        onChange={(e) =>
                          setVariants((arr) => {
                            const copy = [...arr];
                            copy[idx] = { ...copy[idx], label: e.target.value };
                            return copy;
                          })
                        }
                        placeholder="Variant label"
                      />
                    </div>
                    {variantCount > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setVariants((arr) => arr.filter((_, i) => i !== idx));
                          ensureVariantCount(variantCount - 1);
                        }}
                        className="rounded-xl border px-3 py-1 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm">Basis</label>
                      <select
                        value={v.basis}
                        onChange={(e) =>
                          setVariants((arr) => {
                            const copy = [...arr];
                            copy[idx] = { ...copy[idx], basis: e.target.value as Basis };
                            return copy;
                          })
                        }
                        className="w-full rounded-xl border p-2 outline-none focus:ring"
                      >
                        <option value="second">second</option>
                        <option value="minute">minute</option>
                        <option value="hour">hour</option>
                        <option value="project">project</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm">
                        {v.basis === "project" ? "Units" : "Duration"}
                      </label>
                      {v.basis === "project" ? (
                        <input
                          type="number"
                          min={1}
                          value={v.projectUnits}
                          onChange={(e) =>
                            setVariants((arr) => {
                              const copy = [...arr];
                              copy[idx] = {
                                ...copy[idx],
                                projectUnits: Math.max(1, Number(e.target.value || 1)),
                              };
                              return copy;
                            })
                          }
                          className="w-full rounded-xl border p-2 outline-none focus:ring"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            inputMode="numeric"
                            value={v.minutes}
                            onChange={(e) =>
                              onNumOnly(e.target.value) &&
                              setVariants((arr) => {
                                const copy = [...arr];
                                copy[idx] = { ...copy[idx], minutes: e.target.value };
                                return copy;
                              })
                            }
                            placeholder="min"
                            className="w-full rounded-xl border p-2 outline-none focus:ring"
                          />
                          <span className="text-sm text-neutral-500">min</span>
                          <input
                            inputMode="numeric"
                            value={v.seconds}
                            onChange={(e) =>
                              onNumOnly(e.target.value) &&
                              setVariants((arr) => {
                                const copy = [...arr];
                                copy[idx] = { ...copy[idx], seconds: e.target.value };
                                return copy;
                              })
                            }
                            placeholder="sec"
                            className="w-full rounded-xl border p-2 outline-none focus:ring"
                          />
                          <span className="text-sm text-neutral-500">sec</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 mt-2 block text-sm">Pricing mode</label>
                    <div className="flex flex-wrap gap-3">
                      <label className="inline-flex items-center gap-2 rounded-xl border px-3 py-2">
                        <input
                          type="radio"
                          name={`pricing-${idx}`}
                          checked={v.pricingMode === "auto"}
                          onChange={() =>
                            setVariants((arr) => {
                              const copy = [...arr];
                              copy[idx] = { ...copy[idx], pricingMode: "auto" };
                              return copy;
                            })
                          }
                        />
                        <span>Auto (client rate – ৳{toBDT(defaultRate)})</span>
                      </label>
                      <label className="inline-flex items-center gap-2 rounded-xl border px-3 py-2">
                        <input
                          type="radio"
                          name={`pricing-${idx}`}
                          checked={v.pricingMode === "manual_rate"}
                          onChange={() =>
                            setVariants((arr) => {
                              const copy = [...arr];
                              copy[idx] = { ...copy[idx], pricingMode: "manual_rate" };
                              return copy;
                            })
                          }
                        />
                        <span>Manual rate</span>
                      </label>
                      <label className="inline-flex items-center gap-2 rounded-xl border px-3 py-2">
                        <input
                          type="radio"
                          name={`pricing-${idx}`}
                          checked={v.pricingMode === "manual_total"}
                          onChange={() =>
                            setVariants((arr) => {
                              const copy = [...arr];
                              copy[idx] = { ...copy[idx], pricingMode: "manual_total" };
                              return copy;
                            })
                          }
                        />
                        <span>Manual total</span>
                      </label>
                    </div>
                  </div>

                  {v.pricingMode === "manual_rate" && (
                    <div>
                      <label className="mb-1 block text-sm">Custom rate</label>
                      <input
                        type="number"
                        min={0}
                        value={v.customRate}
                        onChange={(e) =>
                          setVariants((arr) => {
                            const copy = [...arr];
                            copy[idx] = {
                              ...copy[idx],
                              customRate: e.target.value === "" ? "" : Number(e.target.value),
                            };
                            return copy;
                          })
                        }
                        className="w-full rounded-xl border p-2 outline-none focus:ring"
                        placeholder="e.g., 400"
                      />
                    </div>
                  )}

                  {v.pricingMode === "manual_total" && (
                    <div>
                      <label className="mb-1 block text-sm">Manual total</label>
                      <input
                        type="number"
                        min={0}
                        value={v.manualTotal}
                        onChange={(e) =>
                          setVariants((arr) => {
                            const copy = [...arr];
                            copy[idx] = {
                              ...copy[idx],
                              manualTotal: e.target.value === "" ? "" : Number(e.target.value),
                            };
                            return copy;
                          })
                        }
                        className="w-full rounded-xl border p-2 outline-none focus:ring"
                        placeholder="e.g., 3000"
                      />
                    </div>
                  )}

                  {v.pricingMode !== "auto" && (
                    <div>
                      <label className="mb-1 block text-sm">Override reason (optional)</label>
                      <input
                        value={v.overrideReason}
                        onChange={(e) =>
                          setVariants((arr) => {
                            const copy = [...arr];
                            copy[idx] = { ...copy[idx], overrideReason: e.target.value };
                            return copy;
                          })
                        }
                        className="w-full rounded-xl border p-2 outline-none focus:ring"
                        placeholder="Why was this price overridden?"
                      />
                    </div>
                  )}

                  <div className="mt-2 text-sm text-neutral-600">
                    Preview total: <span className="tabular-nums">৳{toBDT(final)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* ----------------------- edit: single entry UI ---------------------- */
        <div className="space-y-4 rounded-2xl border p-4">
          <div>
            <label className="mb-1 block text-sm">Variant label (optional)</label>
            <input
              value={singleVariantLabel}
              onChange={(e) => setSingleVariantLabel(e.target.value)}
              className="w-full rounded-xl border p-2 outline-none focus:ring"
              placeholder="e.g., Variant A"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm">Basis</label>
              <select
                value={singleBasis}
                onChange={(e) => setSingleBasis(e.target.value as Basis)}
                className="w-full rounded-xl border p-2 outline-none focus:ring"
              >
                <option value="second">second</option>
                <option value="minute">minute</option>
                <option value="hour">hour</option>
                <option value="project">project</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm">
                {singleBasis === "project" ? "Units" : "Duration"}
              </label>
              {singleBasis === "project" ? (
                <input
                  type="number"
                  min={1}
                  value={singleUnits}
                  onChange={(e) => setSingleUnits(Math.max(1, Number(e.target.value || 1)))}
                  className="w-full rounded-xl border p-2 outline-none focus:ring"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    inputMode="numeric"
                    value={singleMin}
                    onChange={(e) => onNumOnly(e.target.value) && setSingleMin(e.target.value)}
                    placeholder="min"
                    className="w-full rounded-xl border p-2 outline-none focus:ring"
                  />
                  <span className="text-sm text-neutral-500">min</span>
                  <input
                    inputMode="numeric"
                    value={singleSec}
                    onChange={(e) => onNumOnly(e.target.value) && setSingleSec(e.target.value)}
                    placeholder="sec"
                    className="w-full rounded-xl border p-2 outline-none focus:ring"
                  />
                  <span className="text-sm text-neutral-500">sec</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm">Pricing mode</label>
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex items-center gap-2 rounded-xl border px-3 py-2">
                <input
                  type="radio"
                  name="pricing-single"
                  checked={singlePricing === "auto"}
                  onChange={() => setSinglePricing("auto")}
                />
                <span>Auto (client rate – ৳{toBDT(defaultRate)})</span>
              </label>
              <label className="inline-flex items-center gap-2 rounded-xl border px-3 py-2">
                <input
                  type="radio"
                  name="pricing-single"
                  checked={singlePricing === "manual_rate"}
                  onChange={() => setSinglePricing("manual_rate")}
                />
                <span>Manual rate</span>
              </label>
              <label className="inline-flex items-center gap-2 rounded-xl border px-3 py-2">
                <input
                  type="radio"
                  name="pricing-single"
                  checked={singlePricing === "manual_total"}
                  onChange={() => setSinglePricing("manual_total")}
                />
                <span>Manual total</span>
              </label>
            </div>
          </div>

          {singlePricing === "manual_rate" && (
            <div>
              <label className="mb-1 block text-sm">Custom rate</label>
              <input
                type="number"
                min={0}
                value={singleRate}
                onChange={(e) => setSingleRate(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-xl border p-2 outline-none focus:ring"
                placeholder="e.g., 400"
              />
            </div>
          )}

          {singlePricing === "manual_total" && (
            <div>
              <label className="mb-1 block text-sm">Manual total</label>
              <input
                type="number"
                min={0}
                value={singleTotal}
                onChange={(e) => setSingleTotal(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-xl border p-2 outline-none focus:ring"
                placeholder="e.g., 3000"
              />
            </div>
          )}

          {singlePricing !== "auto" && (
            <div>
              <label className="mb-1 block text-sm">Override reason (optional)</label>
              <input
                value={singleReason}
                onChange={(e) => setSingleReason(e.target.value)}
                className="w-full rounded-xl border p-2 outline-none focus:ring"
                placeholder="Why was this price overridden?"
              />
            </div>
          )}

          <div className="text-sm text-neutral-600">
            Preview total: <span className="tabular-nums">৳{toBDT(singlePreview)}</span>
          </div>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm">Note</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-xl border p-2 outline-none focus:ring"
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={markDelivered}
            onChange={(e) => setMarkDelivered(e.target.checked)}
          />
          <span>Mark delivered</span>
        </label>

        <div className="flex items-center gap-2">
          {isEdit && (
            <button
              type="button"
              onClick={onDelete}
              disabled={saving}
              className="rounded-xl border px-4 py-2 text-red-600 disabled:opacity-50"
            >
              Delete
            </button>
          )}
          <button
            type="button"
            className="rounded-xl border px-4 py-2"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50"
            disabled={saving}
            type="submit"
          >
            {saving ? "Saving..." : isEdit ? "Save changes" : "Save entry(ies)"}
          </button>
        </div>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}
    </form>
  );
}
