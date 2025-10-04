"use client";

import { motion, useScroll, useTransform } from "framer-motion";

export default function ParallaxField() {
  const { scrollYProgress } = useScroll();
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -180]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <motion.div
        style={{ y: y1 }}
        className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-pink-200 to-rose-300 blur-3xl opacity-60"
      />
      <motion.div
        style={{ y: y2 }}
        className="absolute top-40 -right-20 h-80 w-80 rounded-full bg-gradient-to-br from-sky-200 to-indigo-300 blur-3xl opacity-60"
      />
    </div>
  );
}
