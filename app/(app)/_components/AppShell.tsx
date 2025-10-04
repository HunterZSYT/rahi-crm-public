// app/(app)/_components/AppShell.tsx
"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { MotionConfig, AnimatePresence, m } from "framer-motion";
import NextTopLoader from "nextjs-toploader";

/** Subtle global parallax background (very soft, low z-index) */
function ParallaxBG() {
  const aRef = React.useRef<HTMLDivElement>(null);
  const bRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      // small movement only
      if (aRef.current) aRef.current.style.transform = `translate3d(0, ${y * 0.05}px, 0)`;
      if (bRef.current) bRef.current.style.transform = `translate3d(0, ${-y * 0.035}px, 0)`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Softer, low-opacity blobs so they never wash content */}
      <div
        ref={aRef}
        className="absolute left-[-20%] top-[-25%] h-[55vh] w-[55vh] rounded-full bg-violet-300/15 blur-3xl"
      />
      <div
        ref={bRef}
        className="absolute right-[-15%] bottom-[-28%] h-[50vh] w-[50vh] rounded-full bg-emerald-300/12 blur-3xl"
      />
    </div>
  );
}

/** Page transition wrapper */
function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    // initial={false} => do NOT fade the first SSR paint
    <AnimatePresence mode="wait" initial={false}>
      <m.main
        key={pathname}
        // no initial hide on first load
        initial={false}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } }}
        exit={{ opacity: 0, y: -6, transition: { duration: 0.18, ease: "easeIn" } }}
      >
        {children}
      </m.main>
    </AnimatePresence>
  );
}

/** App-wide shell: top loader + parallax + transitions */
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      {/* Progress bar on route/data transitions */}
      <NextTopLoader
        color="#6D28D9"     // visible on light/dark
        height={3}
        crawlSpeed={140}
        showSpinner={false}
        shadow="none"
        zIndex={1600}
      />

      {/* Background */}
      <ParallaxBG />

      {/* Page transitions */}
      <PageTransition>{children}</PageTransition>
    </MotionConfig>
  );
}
