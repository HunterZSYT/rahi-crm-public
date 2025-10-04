// components/GlobalNavLoader.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Spinner from "./Spinner"; // the Spinner you already have

/**
 * Shows a short full-screen overlay on route changes, even if the next page
 * loads instantly. Plays an exit animation before unmounting.
 *
 * Works alongside segment-level `loading.tsx`.
 */
export default function GlobalNavLoader({
  minShowMs = 800,   // minimum time the overlay stays visible
  exitMs = 300,      // exit (fade-out) duration
}: {
  minShowMs?: number;
  exitMs?: number;
}) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const prevPath = useRef<string | null>(null);
  const firstPaintDone = useRef(false);

  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Don’t show on the very first mount.
    if (!firstPaintDone.current) {
      firstPaintDone.current = true;
      prevPath.current = pathname;
      return;
    }

    if (pathname !== prevPath.current) {
      prevPath.current = pathname;

      // Start overlay
      setOpen(true);

      // Keep it for a minimum time, then allow exit animation
      const minTimer = window.setTimeout(() => {
        setOpen(false);
      }, minShowMs);

      return () => window.clearTimeout(minTimer);
    }
  }, [pathname, minShowMs]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="global-nav-loader"
          className="fixed inset-0 z-[70] grid place-items-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: reduce ? 0 : 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
        >
          {/* aurora glass backdrop */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <motion.div
              className="absolute -top-40 -left-20 h-[60vh] w-[60vw] rounded-full bg-gradient-to-tr from-fuchsia-400 via-purple-400 to-rose-300 opacity-40 blur-3xl mix-blend-multiply dark:opacity-30"
              animate={reduce ? {} : { x: [0, 40, -20, 0], y: [0, 20, -10, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute -bottom-40 -right-24 h-[55vh] w-[55vw] rounded-full bg-gradient-to-br from-sky-300 via-indigo-400 to-pink-300 opacity-40 blur-3xl mix-blend-multiply dark:opacity-30"
              animate={reduce ? {} : { x: [0, -30, 20, 0], y: [0, -20, 10, 0] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm dark:bg-neutral-950/60" />
          </div>

          {/* The same trio loader you use in loading.tsx, via Spinner */}
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ duration: reduce ? 0 : exitMs / 1000 }}
          >
            <Spinner fullscreen={false} glass={false} label="Loading" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
