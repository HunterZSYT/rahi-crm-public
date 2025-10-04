"use client";

import { motion } from "framer-motion";

export default function Spinner() {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-white/70 backdrop-blur-sm">
      <motion.div
        className="h-10 w-10 rounded-full border-2 border-neutral-300 border-t-black"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
      />
    </div>
  );
}
