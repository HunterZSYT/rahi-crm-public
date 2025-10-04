// components/motion/MotionProvider.tsx
"use client";

import { LazyMotion, domMax, MotionConfig, AnimatePresence, m } from "framer-motion";
import { usePathname } from "next/navigation";
import * as React from "react";

export default function MotionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <LazyMotion features={domMax} strict={false}>
      <MotionConfig reducedMotion="user">
        <AnimatePresence mode="wait">
          <m.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 160, damping: 20, mass: 0.9 }}
          >
            {children}
          </m.div>
        </AnimatePresence>
      </MotionConfig>
    </LazyMotion>
  );
}
