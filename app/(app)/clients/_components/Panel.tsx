"use client";

import { type ReactNode } from "react";

/* tiny util so we don't pull a dep just to merge classes */
function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

type Props = {
  title?: ReactNode;
  right?: ReactNode;
  className?: string;
  /** optional extra classes */
  headerClassName?: string;
  contentClassName?: string;
  /** make the header stick to the top of the panel (useful for tall tables) */
  stickyHeader?: boolean;
};

/**
 * Section card with safe overflow (so popovers/dropdowns aren't clipped).
 * Responsive header: title truncates, actions wrap to a new row on small screens.
 *
 * NOTE: Header uses a higher z-index than table thead (z-10) so menus/popovers
 * render above sticky table headers.
 */
export default function Panel({
  title,
  right,
  className = "",
  headerClassName = "",
  contentClassName = "",
  stickyHeader = false,
  children,
}: Props & { children: ReactNode }) {
  return (
    <section
      className={cx(
        "relative overflow-visible rounded-2xl border bg-white/95 shadow-sm",
        "supports-[backdrop-filter]:bg-white/80",
        "dark:bg-neutral-900/80 dark:border-neutral-800 dark:supports-[backdrop-filter]:bg-neutral-900/70",
        className
      )}
    >
      {(title || right) && (
        <header
          className={cx(
            // give header its own stacking context by default
            "relative z-20 flex flex-wrap items-center justify-between gap-2 border-b px-4 sm:px-5 py-2.5",
            "dark:border-neutral-800",
            // when sticky, bump z-index above table thead (which is z-10)
            stickyHeader &&
              "sticky top-0 z-30 rounded-t-2xl bg-inherit backdrop-blur supports-[backdrop-filter]:bg-inherit/90",
            headerClassName
          )}
        >
          {/* title truncates so actions have room */}
          {title ? (
            <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">
              {title}
            </h2>
          ) : (
            <span className="flex-1" />
          )}

          {/* actions wrap to their own row on small screens and align right */}
          {right ? (
            <div className="w-full shrink-0 sm:w-auto sm:shrink">
              <div className="flex flex-wrap items-center justify-end gap-2">
                {right}
              </div>
            </div>
          ) : null}
        </header>
      )}

      <div
        className={cx(
          "px-4 sm:px-5 py-3 text-[13.5px] text-neutral-900 dark:text-neutral-100",
          contentClassName
        )}
      >
        {children}
      </div>
    </section>
  );
}
