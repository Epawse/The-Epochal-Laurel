/**
 * Engine-internal type aliases derived from the game schema.
 * Avoids coupling engine code to Zod internals.
 */

import type { Character, Stats, StatChanges, GameState, World, Dynasty } from "@/lib/game/schema";

// Re-export schema types used by engine modules
export type { Character, Stats, StatChanges, GameState, World, Dynasty };

// Derived types from Character schema
export type Child = Character["family"]["children"][number];
export type Spouse = NonNullable<Character["family"]["children"]> extends Array<infer T> ? T : never;
export type ExamHistoryEntry = Character["exam_history"][number];
export type StatusEffect = Character["status_effects"][number];
export type Relationship = Character["relationships"][number];

// World sub-types
export type CourtWhims = World["court_whims"];
export type CourtWhimsRevealed = World["court_whims_revealed"];
export type ExamSchedule = World["exam_schedule"];
export type AuxiliaryTools = World["auxiliary_tools"];

// Dynasty sub-types
export type Legacy = Dynasty["legacy"];
export type Ancestor = Dynasty["ancestors"][number];
export type AvailableBlessing = Dynasty["available_blessings"][number];
