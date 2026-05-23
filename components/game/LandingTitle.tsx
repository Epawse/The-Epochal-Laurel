"use client";

import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function LandingTitle() {
  const reduce = useReducedMotion();

  return (
    <motion.h1
      className="font-calli text-[clamp(64px,9.5vw,128px)] text-gold-glow tracking-[0.32em] leading-[0.95] m-0 whitespace-nowrap"
      style={{
        textShadow:
          "0 6px 24px rgba(0,0,0,0.5), 0 0 40px rgba(196,57,44,0.10)",
      }}
      initial={
        reduce
          ? false
          : { opacity: 0, filter: "blur(12px)", letterSpacing: "0.6em" }
      }
      animate={{ opacity: 1, filter: "blur(0px)", letterSpacing: "0.32em" }}
      transition={{ duration: 1.2, ease: [0.2, 0.7, 0.2, 1] }}
    >
      百世流芳
    </motion.h1>
  );
}
