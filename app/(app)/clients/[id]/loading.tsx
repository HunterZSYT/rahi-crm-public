// app/(whatever)/loading.tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";

export default function Loading() {
  const reduce = useReducedMotion();

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center overflow-hidden"
      aria-busy="true"
      aria-live="polite"
    >
      {/* aurora glass */}
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

      {/* trio loader */}
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-6">
          <ShapeLoader variant="circle" reduce={reduce} />
          <ShapeLoader variant="triangle" reduce={reduce} />
          <ShapeLoader variant="square" reduce={reduce} />
        </div>

        {/* label with animated dots */}
        <div className="text-sm text-neutral-700 dark:text-neutral-300">
          Loading
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

/* ---------------- internals ---------------- */

function ShapeLoader({
  variant,
  reduce,
}: {
  variant: "circle" | "triangle" | "square";
  reduce: boolean | null;
}) {
  const duration = 3;

  const commonStroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 10,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
    className:
      "text-neutral-400 dark:text-neutral-600 drop-shadow-[0_0_1px_rgba(0,0,0,0.06)]",
  };

  return (
    <div className="relative h-12 w-12">
      {/* moving dot */}
      <motion.div
        className="absolute left-1/2 top-1/2 h-[6px] w-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-900 dark:bg-white"
        style={{ transformOrigin: "center" }}
        animate={
          reduce
            ? {}
            : variant === "circle"
            ? { rotate: 360 }
            : undefined
        }
        transition={
          reduce
            ? undefined
            : variant === "circle"
            ? { duration, repeat: Infinity, ease: [0.785, 0.135, 0.15, 0.86] }
            : undefined
        }
      >
        {/* for triangle/square we animate the dot with x/y keyframes */}
        {variant !== "circle" && !reduce && (
          <motion.span
            className="absolute block h-[6px] w-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-900 dark:bg-white"
            animate={
              variant === "triangle"
                ? {
                    x: [0, 10, -10, 0],
                    y: [0, -18, -18, 0],
                  }
                : {
                    x: [0, 18, 0, -18, 0],
                    y: [0, -18, -36, -18, 0],
                  }
            }
            transition={{
              duration,
              repeat: Infinity,
              ease: [0.785, 0.135, 0.15, 0.86],
              times: variant === "triangle" ? [0, 0.33, 0.66, 1] : [0, 0.25, 0.5, 0.75, 1],
            }}
          />
        )}
      </motion.div>

      {/* shape path */}
      <svg viewBox={variant === "triangle" ? "0 0 86 80" : "0 0 80 80"} className="h-full w-full">
        {variant === "circle" && (
          <motion.circle
            {...commonStroke}
            cx="40"
            cy="40"
            r="32"
            // 200 ≈ circumference; pattern 3/4 + 1/4, offset anim like the CSS
            strokeDasharray={`${(200 / 4) * 3} ${200 / 4} ${(200 / 4) * 3} ${200 / 4}`}
            initial={{ strokeDashoffset: 75 }}
            animate={reduce ? {} : { strokeDashoffset: [75, 125, 175, 225, 275] }}
            transition={{
              duration,
              repeat: Infinity,
              ease: [0.785, 0.135, 0.15, 0.86],
            }}
          />
        )}

        {variant === "square" && (
          <motion.rect
            {...commonStroke}
            x="8"
            y="8"
            width="64"
            height="64"
            strokeDasharray={`${(256 / 4) * 3} ${256 / 4} ${(256 / 4) * 3} ${256 / 4}`}
            animate={reduce ? {} : { strokeDashoffset: [0, 64, 128, 192, 256] }}
            transition={{
              duration,
              repeat: Infinity,
              ease: [0.785, 0.135, 0.15, 0.86],
            }}
          />
        )}

        {variant === "triangle" && (
          <motion.polygon
            {...commonStroke}
            points="43 8 79 72 7 72"
            strokeDasharray={`145 ${221 - 145} 145 ${221 - 145}`}
            animate={reduce ? {} : { strokeDashoffset: [0, 74, 147, 221] }}
            transition={{
              duration,
              repeat: Infinity,
              ease: [0.785, 0.135, 0.15, 0.86],
            }}
          />
        )}
      </svg>
    </div>
  );
}
