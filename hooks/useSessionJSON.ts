"use client";

import { useMemo, useSyncExternalStore } from "react";

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

/**
 * Read a JSON value from sessionStorage without a setState-in-effect.
 * Returns null during SSR/prerender and when the key is absent or malformed.
 *
 * This is the seam the future persistence rewrite swaps (sessionStorage →
 * DB save-id): call sites take the returned value, not the storage mechanism.
 */
export function useSessionJSON<T>(key: string): T | null {
  const raw = useSyncExternalStore(
    subscribe,
    () => (typeof window === "undefined" ? null : window.sessionStorage.getItem(key)),
    () => null,
  );

  return useMemo(() => {
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }, [raw]);
}
