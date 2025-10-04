"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, m, useReducedMotion } from "framer-motion"; // <-- m, not motion
import Spinner from "./Spinner";

export default function GlobalNavLoader({
  minShowMs = 550,
  exitMs = 160,
}: { minShowMs?: number; exitMs?: number }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const prevPath = useRef<string | null>(null);
  const firstPaintDone = useRef(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!firstPaintDone.current) {
      firstPaintDone.current = true;
      prevPath.current = pathname;
      return;
    }
    if (pathname !== prevPath.current) {
      prevPath.current = pathname;
      setOpen(true);
      const t = window.setTimeout(() => setOpen(false), minShowMs);
      return () => window.clearTimeout(t);
    }
  }, [pathname, minShowMs]);

  return (
    <AnimatePresence>
      {open && (
        <m.div
          key="global-nav-loader"
          className="fixed inset-0 z-[70] grid place-items-center overflow-hidden"
          style={{ contain: "layout paint size style" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.18 }}
        >
          <div className="pointer-events-none absolute inset-0 -z-10 bg-white/70 dark:bg-neutral-950/60 md:supports-[backdrop-filter]:backdrop-blur-[2px]" />

          {!reduce && (
            <>
              <m.div
                className="absolute -top-32 -left-20 h-[45vh] w-[55vw] rounded-[999px] bg-[radial-gradient(60%_60%_at_30%_30%,rgba(99,102,241,.35),transparent)] transform-gpu"
                style={{ willChange: "transform" }}
                animate={{ x: [0, 28, -14, 0], y: [0, 16, -10, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              />
              <m.div
                className="absolute -bottom-32 -right-24 h-[45vh] w-[55vw] rounded-[999px] bg-[radial-gradient(60%_60%_at_70%_70%,rgba(244,114,182,.30),transparent)] transform-gpu"
                style={{ willChange: "transform" }}
                animate={{ x: [0, -22, 14, 0], y: [0, -14, 8, 0] }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
              />
            </>
          )}

          <m.div
            className="transform-gpu"
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ duration: reduce ? 0 : exitMs / 1000 }}
          >
            <Spinner fullscreen={false} glass={false} label="Loading" />
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
