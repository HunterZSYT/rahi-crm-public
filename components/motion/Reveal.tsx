"use client";

import { motion } from "framer-motion";

export function Reveal({
  children,
  delay = 0,
  y = 18,
  once = true,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  once?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ amount: 0.2, once }}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.div>
  );
}
