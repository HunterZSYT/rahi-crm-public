"use client";

import { type ReactNode } from "react";

type Props = {
  title?: ReactNode;
  right?: ReactNode;
  className?: string;
  children: ReactNode;
};

/**
 * Section card with safe overflow (so popovers/dropdowns aren't clipped).
 * Now dark-mode friendly + slightly tighter paddings & type sizes.
 */
export default function Panel({ title, right, className = "", children }: Props) {
  return (
    <section
      className={[
        "relative z-0 overflow-visible",
        "rounded-2xl border bg-white/95 shadow-sm",
        "dark:bg-neutral-900/80 dark:border-neutral-800",
        className,
      ].join(" ")}
    >
      {(title || right) && (
        <header className="flex items-center justify-between gap-3 border-b px-4 sm:px-5 py-2.5 dark:border-neutral-800">
          {title ? (
            <h2 className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
              {title}
            </h2>
          ) : (
            <span />
          )}
          {right ? <div className="shrink-0">{right}</div> : null}
        </header>
      )}
      <div className="px-4 sm:px-5 py-3 text-[13.5px] text-neutral-900 dark:text-neutral-100">
        {children}
      </div>
    </section>
  );
}
