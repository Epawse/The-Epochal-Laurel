import type { StatChanges } from "@/lib/game/schema";

// ── Narrative Log (Transient, sessionStorage) ────────────────────────────────
//
// A scrollable, session-accumulated record of every story beat in the daily loop
// and the exam/inheritance/era detours. This is a PRESENTATION-LAYER concern only:
// entries are derived from values the server already returns (engine narration,
// AI event/dialogue text, exam results). The log lives in sessionStorage under
// "narrative_log" and is NEVER written into the GameState save — the server save
// stays the single source of truth for game logic.
//
// All mutation helpers are pure functions so they can be unit-tested and so the
// page wiring never patches arrays in place.

/** Visual category for a log entry — drives the per-kind rendering in NarrativeTimeline. */
export type NarrativeKind =
  | "action" // routine seasonal action — compact single line
  | "event" // random event outcome summary (interaction still via EventModal)
  | "exam" // exam pass/fail readout
  | "npc" // socialize NPC dialogue
  | "inherit" // generation handoff separator
  | "era" // world era change separator
  | "pending"; // in-flight placeholder, replaced in place once AI returns

export interface NarrativeEntry {
  /** Stable client id; pending entries reuse their id so the settled entry can replace them. */
  id: string;
  kind: NarrativeKind;
  /** Time label, e.g. "春 · 第3年". */
  season: string;
  /** Body text (Chinese). */
  text: string;
  /** Optional headline for rich entries (event/exam title). */
  title?: string;
  /** Optional action id (study/socialize/…) — drives the compact-entry icon. */
  actionId?: string;
  /** Optional dice tier label, e.g. "得手". */
  dice?: string;
  /** Optional stat delta to render as chips. */
  delta?: Partial<StatChanges>;
  status: "settled" | "pending";
}

/** Session accumulation cap. Oldest entries are dropped once exceeded. */
export const NARRATIVE_LOG_CAP = 200;

/** Monotonic-ish client id for a new entry. Not persisted in the save. */
export function makeEntryId(prefix = "n"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Append an entry to the log, capping the result to NARRATIVE_LOG_CAP (oldest dropped).
 * Returns a new array; never mutates the input.
 */
export function appendEntry(
  list: NarrativeEntry[] | null,
  entry: NarrativeEntry,
  cap: number = NARRATIVE_LOG_CAP,
): NarrativeEntry[] {
  const base = list ?? [];
  return capEntries([...base, entry], cap);
}

/**
 * Replace a pending entry (matched by id) with its settled version in place,
 * preserving ordering. If no entry with that id exists, the settled entry is
 * appended instead (so a missed/cleared pending never drops the beat).
 * Returns a new array; never mutates the input.
 */
export function replacePendingEntry(
  list: NarrativeEntry[] | null,
  id: string,
  settled: NarrativeEntry,
  cap: number = NARRATIVE_LOG_CAP,
): NarrativeEntry[] {
  const base = list ?? [];
  const idx = base.findIndex((e) => e.id === id);
  if (idx === -1) {
    return appendEntry(base, settled, cap);
  }
  const next = base.slice();
  next[idx] = settled;
  return capEntries(next, cap);
}

/**
 * Drop the oldest entries until the list is within `cap`.
 * Returns a new array when trimming is needed; never mutates the input.
 */
export function capEntries(
  list: NarrativeEntry[],
  cap: number = NARRATIVE_LOG_CAP,
): NarrativeEntry[] {
  if (cap <= 0) return [];
  if (list.length <= cap) return list;
  return list.slice(list.length - cap);
}
