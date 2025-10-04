"use client";

import { motion, useReducedMotion } from "framer-motion";

export default function Spinner({
  fullscreen = true,
  label = "Loading…",
}: {
  fullscreen?: boolean;
  label?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <div
      className={
        fullscreen
          ? "fixed inset-0 z-[60] grid place-items-center overflow-hidden"
          : "relative grid place-items-center overflow-hidden"
      }
      aria-busy="true"
      aria-live="polite"
    >
      {/* aurora background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          className="absolute -top-40 -left-20 h-[60vh] w-[60vw] rounded-full blur-3xl opacity-40 bg-gradient-to-tr from-indigo-500 via-fuchsia-500 to-emerald-400 mix-blend-multiply dark:opacity-30"
          animate={reduce ? {} : { x: [0, 40, -20, 0], y: [0, 20, -10, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-40 -right-24 h-[55vh] w-[55vw] rounded-full blur-3xl opacity-40 bg-gradient-to-br from-sky-400 via-violet-500 to-pink-500 mix-blend-multiply dark:opacity-30"
          animate={reduce ? {} : { x: [0, -30, 20, 0], y: [0, -20, 10, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm dark:bg-neutral-950/60" />
      </div>

      {/* loader */}
      <div className="flex flex-col items-center gap-5">
        {/* orbiting dot */}
        <motion.div
          className="relative h-14 w-14"
          animate={reduce ? {} : { rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
        >
          <div className="absolute inset-0 rounded-full border-2 border-neutral-300/70 dark:border-neutral-700/70" />
          <div className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-900 shadow-sm dark:bg-white" />
        </motion.div>

        {/* label with animated dots */}
        <div className="text-sm text-neutral-700 dark:text-neutral-300">
          {label}
          {!reduce && (
            <span className="inline-flex w-8 overflow-hidden align-bottom">
              <motion.span
                className="w-2"
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 1], delay: 0 }}
              >
                .
              </motion.span>
              <motion.span
                className="w-2"
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 1], delay: 0.2 }}
              >
                .
              </motion.span>
              <motion.span
                className="w-2"
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 1], delay: 0.4 }}
              >
                .
              </motion.span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
