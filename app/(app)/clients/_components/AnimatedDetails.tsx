"use client";

import {
  useId,
  useState,
  useRef,
  useLayoutEffect,
  useEffect,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

type Props = {
  title: ReactNode;          // left side
  right?: ReactNode;         // optional right text (e.g., “Toggle”)
  meta?: ReactNode;          // NEW: compact summary chips shown in header (right side)
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
};

export default function AnimatedDetails({
  title,
  right,
  meta,
  children,
  defaultOpen = false,       // collapsed by default now
  className = "",
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();

  const contentRef = useRef<HTMLDivElement | null>(null);
  const [contentH, setContentH] = useState(0);

  const readHeight = () =>
    contentRef.current ? contentRef.current.scrollHeight : 0;

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    setContentH(el.scrollHeight);

    const canObserve =
      typeof window !== "undefined" && "ResizeObserver" in window;
    if (!canObserve) return;

    const ro = new ResizeObserver(() => {
      if (!contentRef.current) return;
      setContentH(contentRef.current.scrollHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => setContentH(readHeight()));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const heightSpring = {
    type: "spring" as const,
    stiffness: 220,
    damping: 24,
    mass: 0.9,
    restDelta: 0.2,
  };
  const innerSpring = {
    type: "spring" as const,
    stiffness: 260,
    damping: 22,
    mass: 0.9,
  };

  return (
    <section className={className} aria-labelledby={id}>
      {/* Header bar (looks great even when closed) */}
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          "w-full select-none",
          "rounded-2xl border bg-white/95 shadow-sm",
          // when closed make it look like a compact toolbar/pill
          open ? "px-5 py-3" : "px-4 py-3",
        ].join(" ")}
        aria-expanded={open}
        aria-controls={`${id}-content`}
        id={id}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.985 }}
        transition={{ type: "spring", stiffness: 420, damping: 28 }}
      >
        <div className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-neutral-800">
            <motion.span
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 26 }}
              className="inline-flex"
            >
              <ChevronDown size={18} className="text-neutral-500" />
            </motion.span>
            {title}
          </span>

          <div className="flex items-center gap-3">
            {/* compact meta summary chips on the right */}
            {meta && (
              <div className="hidden md:flex items-center gap-2">
                {meta}
              </div>
            )}
            {right && (
              <span className="text-xs text-neutral-500">{right}</span>
            )}
          </div>
        </div>
      </motion.button>

      {/* Content (spring height; no fade) */}
      <motion.div
        id={`${id}-content`}
        animate={{ height: open ? contentH : 0 }}
        transition={heightSpring}
        style={{ overflow: "clip", transformOrigin: "top" }}
      >
        <motion.div
          ref={contentRef}
          className="px-5 pb-5"
          animate={{ scaleY: open ? 1 : 0.98, y: open ? 0 : -4 }}
          transition={innerSpring}
        >
          {children}
        </motion.div>
      </motion.div>
    </section>
  );
}
