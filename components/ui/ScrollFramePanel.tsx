"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface ScrollFramePanelProps {
  children: ReactNode;
}

export function ScrollFramePanel({ children }: ScrollFramePanelProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className="w-full max-w-[1080px] relative z-[1] bg-[image:url('/assets/scroll-frame.png')] bg-[length:100%_100%] bg-no-repeat grid place-items-stretch"
      style={{
        padding: "clamp(58px, 7.5%, 88px) clamp(96px, 10.5%, 132px)",
        transformOrigin: "top center",
      }}
      initial={reduce ? false : { opacity: 0, scaleY: 0.6 }}
      animate={{ opacity: 1, scaleY: 1 }}
      transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
    >
      <div className="relative flex flex-col min-h-0 text-bone">
        {children}
      </div>
    </motion.div>
  );
}
