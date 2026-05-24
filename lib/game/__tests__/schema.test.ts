import { describe, expect, it } from "vitest";
import { createCharacter } from "@/lib/engine/reducer";
import { createRng } from "@/lib/engine/rng";
import { GameStateSchema } from "../schema";

describe("GameStateSchema", () => {
  it("defaults new roguelike fields when parsing old saves", () => {
    const oldSave = structuredClone(createCharacter("陈", "farming_family", createRng(42))) as Record<string, unknown>;
    oldSave.version = "0.1.0";
    const character = oldSave.character as Record<string, unknown>;
    const world = oldSave.world as Record<string, unknown>;
    const dynasty = oldSave.dynasty as Record<string, unknown>;

    delete character.relics;
    delete character.heirloom_relic_id;
    delete character.seen_relic_ids;
    delete character.skills;
    delete character.modifiers;
    delete world.world_modifiers;
    delete dynasty.pending_heirloom;
    delete oldSave.pending_relic_draft;

    const parsed = GameStateSchema.parse(oldSave);

    expect(parsed.character.relics).toEqual([]);
    expect(parsed.character.heirloom_relic_id).toBeNull();
    expect(parsed.character.seen_relic_ids).toEqual([]);
    expect(parsed.character.skills).toEqual([]);
    expect(parsed.character.modifiers).toEqual([]);
    expect(parsed.world.world_modifiers).toEqual([]);
    expect(parsed.dynasty.pending_heirloom).toBeNull();
    expect(parsed.pending_relic_draft).toBeNull();
  });

  it("parses legacy events without dice checks or rewards", () => {
    const save = structuredClone(createCharacter("陈", "farming_family", createRng(42))) as Record<string, unknown>;
    save.current_event = {
      id: "legacy_event",
      type: "opportunity",
      title: "旧事",
      description: "旧格式事件",
      choices: [
        {
          id: "a",
          label: "应下",
          stat_changes: { erudition: 1, fortune: 0, drive: 0, wealth: 0 },
          risk: null,
          narrative_hint: "",
        },
        {
          id: "b",
          label: "作罢",
          stat_changes: { erudition: 0, fortune: 1, drive: 0, wealth: 0 },
          risk: null,
          narrative_hint: "",
        },
      ],
      allows_free_input: false,
      context_for_judge: { relevant_npcs: [], relevant_items: [] },
    };

    const parsed = GameStateSchema.parse(save);

    expect(parsed.current_event?.choices[0].check ?? null).toBeNull();
    expect(parsed.current_event?.reward ?? null).toBeNull();
  });
});
