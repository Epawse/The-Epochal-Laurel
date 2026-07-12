import { describe, expect, it } from "vitest";
import {
  appendEntry,
  capEntries,
  makeEntryId,
  NARRATIVE_LOG_CAP,
  replacePendingEntry,
  type NarrativeEntry,
} from "../narrativeLog";

function entry(id: string, overrides: Partial<NarrativeEntry> = {}): NarrativeEntry {
  return {
    id,
    kind: "action",
    season: "春 · 第1年",
    text: `事 ${id}`,
    status: "settled",
    ...overrides,
  };
}

describe("appendEntry", () => {
  it("appends to an empty/null list without mutating the input", () => {
    const result = appendEntry(null, entry("a"));
    expect(result.map((e) => e.id)).toEqual(["a"]);

    const base: NarrativeEntry[] = [entry("a")];
    const next = appendEntry(base, entry("b"));
    expect(next.map((e) => e.id)).toEqual(["a", "b"]);
    expect(base.map((e) => e.id)).toEqual(["a"]); // unchanged
  });

  it("caps to the limit by dropping the oldest entries", () => {
    const list = Array.from({ length: 5 }, (_, i) => entry(`e${i}`));
    const result = appendEntry(list, entry("new"), 3);
    expect(result).toHaveLength(3);
    expect(result.map((e) => e.id)).toEqual(["e3", "e4", "new"]);
  });
});

describe("replacePendingEntry", () => {
  it("replaces a pending entry in place, preserving order", () => {
    const list: NarrativeEntry[] = [
      entry("a"),
      entry("p", { kind: "pending", status: "pending", text: "推演中" }),
      entry("c"),
    ];
    const settled = entry("p", { kind: "event", title: "市集风波", text: "结算摘要" });
    const result = replacePendingEntry(list, "p", settled);

    expect(result.map((e) => e.id)).toEqual(["a", "p", "c"]);
    const replaced = result.find((e) => e.id === "p");
    expect(replaced?.kind).toBe("event");
    expect(replaced?.status).toBe("settled");
    expect(replaced?.title).toBe("市集风波");
  });

  it("appends the settled entry when the pending id is missing", () => {
    const list: NarrativeEntry[] = [entry("a")];
    const settled = entry("missing", { kind: "npc" });
    const result = replacePendingEntry(list, "missing", settled);
    expect(result.map((e) => e.id)).toEqual(["a", "missing"]);
  });

  it("does not mutate the input list", () => {
    const list: NarrativeEntry[] = [entry("p", { status: "pending" })];
    const settled = entry("p", { status: "settled" });
    replacePendingEntry(list, "p", settled);
    expect(list[0]?.status).toBe("pending");
  });

  it("re-caps after replacing", () => {
    const list = Array.from({ length: 4 }, (_, i) => entry(`e${i}`));
    const result = replacePendingEntry(list, "e0", entry("e0", { text: "x" }), 3);
    expect(result).toHaveLength(3);
    // e0 stays in place but the cap drops from the front
    expect(result.map((e) => e.id)).toEqual(["e1", "e2", "e3"]);
  });
});

describe("capEntries", () => {
  it("returns the list unchanged when within cap", () => {
    const list = [entry("a"), entry("b")];
    expect(capEntries(list, 5)).toBe(list);
  });

  it("drops the oldest when over cap", () => {
    const list = Array.from({ length: 6 }, (_, i) => entry(`e${i}`));
    expect(capEntries(list, 2).map((e) => e.id)).toEqual(["e4", "e5"]);
  });

  it("returns empty for a non-positive cap", () => {
    expect(capEntries([entry("a")], 0)).toEqual([]);
  });

  it("defaults to NARRATIVE_LOG_CAP", () => {
    const list = Array.from({ length: NARRATIVE_LOG_CAP + 10 }, (_, i) => entry(`e${i}`));
    expect(capEntries(list)).toHaveLength(NARRATIVE_LOG_CAP);
  });
});

describe("makeEntryId", () => {
  it("produces unique ids with the given prefix", () => {
    const ids = new Set(Array.from({ length: 50 }, () => makeEntryId("evt")));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id.startsWith("evt-")).toBe(true);
  });
});
