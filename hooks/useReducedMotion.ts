"use client";

import { useReducedMotion as useFramerReducedMotion } from "framer-motion";

/**
 * Returns true if the user prefers reduced motion.
 * Wraps Framer Motion's hook for consistent usage across components.
 */
export function useReducedMotion(): boolean {
  return useFramerReducedMotion() ?? false;
}
