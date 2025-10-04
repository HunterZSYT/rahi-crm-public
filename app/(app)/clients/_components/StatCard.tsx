"use client";

import { motion, MotionConfig } from "framer-motion";

export default function StatCard({
  label,
  value,
  className = "",
  sub,
}: {
  label: string;
  value: string;
  className?: string;
  sub?: { label: string; value: string }[];
}) {
  return (
    <MotionConfig transition={{ type: "spring", stiffness: 380, damping: 28 }}>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        whileHover={{ y: -2 }}
        className={[
          "group relative overflow-hidden rounded-2xl border shadow-sm",
          "bg-white dark:bg-neutral-900",
          "border-neutral-200 dark:border-neutral-800",
          className,
        ].join(" ")}
      >
        {/* soft top highlight (adjusted for dark) */}
        <div className="pointer-events-none absolute inset-x-0 -top-10 h-20 bg-gradient-to-b from-indigo-50/60 to-transparent dark:from-indigo-400/10" />

        <div className="relative p-4">
          <div className="text-[11px] font-medium tracking-wide text-neutral-500 dark:text-neutral-400">
            {label}
          </div>
          {/* slightly smaller number for a lighter feel */}
          <div className="mt-1 text-xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
            {value}
          </div>

          {sub && sub.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11.5px] text-neutral-700 dark:text-neutral-300">
              {sub.map((s) => (
                <div
                  key={s.label}
                  className="flex items-center justify-between rounded-xl border px-2.5 py-1.5 border-neutral-200 dark:border-neutral-800"
                >
                  <span className="text-neutral-500 dark:text-neutral-400">{s.label}</span>
                  <span className="font-semibold tabular-nums">{s.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* hover ring */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl ring-0"
          whileHover={{
            boxShadow:
              "0 0 0 2px rgba(165,180,252,.55)", // light
          }}
        />
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-0 dark:[box-shadow:0_0_0_2px_rgba(129,140,248,.35)] opacity-0 group-hover:opacity-100 transition-opacity" />
      </motion.div>
    </MotionConfig>
  );
}
