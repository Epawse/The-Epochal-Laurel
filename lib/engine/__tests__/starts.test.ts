import { describe, expect, it } from "vitest";
import { createCharacter } from "../reducer";
import { createRng } from "../rng";
import { applyStartingPackage } from "../starts";

describe("starts", () => {
  it("applies deterministic rollable starting packages for the same seed", () => {
    const seed = 20260524;
    const firstBase = createCharacter("陈", "humble_scholar", createRng(seed));
    const firstRng = createRng(seed);
    createCharacter("陈", "humble_scholar", firstRng);

    const secondBase = createCharacter("陈", "humble_scholar", createRng(seed));
    const secondRng = createRng(seed);
    createCharacter("陈", "humble_scholar", secondRng);

    const first = applyStartingPackage(firstBase, firstRng, seed);
    const second = applyStartingPackage(secondBase, secondRng, seed);

    expect(first.startingPackage).toEqual(second.startingPackage);
    expect(first.state.character.stats).toEqual(second.state.character.stats);
    expect(first.state.character.relics[0]?.id).toBe(second.state.character.relics[0]?.id);
  });

  it("adds a bonus trait, relic, and passive skill to the base character", () => {
    const seed = 99;
    const rng = createRng(seed);
    const base = createCharacter("陈", "merchant_son", rng);
    const result = applyStartingPackage(base, rng, seed);

    expect(result.state.character.traits).toContain(result.startingPackage.bonusTrait);
    expect(result.state.character.relics.map((relic) => relic.id)).toContain(
      result.startingPackage.bonusRelic.id
    );
    expect(result.state.character.skills.map((skill) => skill.id)).toContain(
      result.startingPackage.bonusSkill.id
    );
    expect(result.state.character.seen_relic_ids).toContain(result.startingPackage.bonusRelic.id);
  });
});
