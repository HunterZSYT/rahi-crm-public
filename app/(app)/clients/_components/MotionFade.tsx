"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";

type Props = {
  children: ReactNode;
  /** seconds to delay (use for simple staggering) */
  delay?: number;
  /** y offset in pixels (defaults to 8) */
  y?: number;
  /** extra classes */
  className?: string;
};

export default function MotionFade({
  children,
  delay = 0,
  y = 8,
  className = "",
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
      transition={{ duration: 0.35, ease: "easeOut", delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
