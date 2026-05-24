"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

const SESSION_JSON_EVENT = "epochal-laurel-session-json";

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener(SESSION_JSON_EVENT, callback);
  const timer = window.setTimeout(callback, 0);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SESSION_JSON_EVENT, callback);
    window.clearTimeout(timer);
  };
}

function notifySessionJSONChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SESSION_JSON_EVENT));
}

export function setSessionJSON(key: string, value: unknown): void {
  window.sessionStorage.setItem(key, JSON.stringify(value));
  notifySessionJSONChange();
}

export function removeSessionJSON(key: string): void {
  window.sessionStorage.removeItem(key);
  notifySessionJSONChange();
}

function readSessionValue(key: string): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(key);
}

/**
 * Read a JSON value from sessionStorage without a setState-in-effect.
 * Returns null during SSR/prerender and when the key is absent or malformed.
 *
 * This is the seam the future persistence rewrite swaps (sessionStorage →
 * DB save-id): call sites take the returned value, not the storage mechanism.
 */
export function useSessionJSON<T>(key: string): T | null {
  const storeRaw = useSyncExternalStore(
    subscribe,
    () => readSessionValue(key),
    () => null,
  );
  const [hydratedRaw, setHydratedRaw] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setHydratedRaw(readSessionValue(key));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [key, storeRaw]);

  const raw = storeRaw ?? hydratedRaw;

  return useMemo(() => {
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }, [raw]);
}
