import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCharacter } from "@/lib/engine/reducer";
import { createRng } from "@/lib/engine/rng";
import { createSave, loadSave, upsertSave } from "../queries";

const insertSingle = vi.fn();
const insertSelect = vi.fn(() => ({ single: insertSingle }));
const insert = vi.fn(() => ({ select: insertSelect }));

vi.mock("../client", () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      insert,
    })),
  })),
}));

describe("db queries", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    delete process.env.SUPABASE_MEMORY_FALLBACK;
  });

  it("returns the generated save id when Supabase insert succeeds", async () => {
    insertSingle.mockResolvedValueOnce({
      data: { id: "00000000-0000-0000-0000-000000000001" },
      error: null,
    });

    const state = createCharacter("陈", "farming_family", createRng(42));

    await expect(createSave(state)).resolves.toBe(
      "00000000-0000-0000-0000-000000000001"
    );
  });

  it("falls back to an in-memory save when Supabase insert fails", async () => {
    insertSingle.mockResolvedValueOnce({
      data: null,
      error: {
        code: "PGRST204",
        message: "Could not find the 'turn_number' column",
      },
    });

    const state = createCharacter("李", "merchant_son", createRng(7));
    const id = await createSave(state);

    expect(id).not.toBe("");
    await expect(loadSave(id)).resolves.toMatchObject({
      dynasty: { family_name: "李" },
      character: { origin: "merchant_son" },
    });

    const nextState = { ...state, turn_number: state.turn_number + 1 };
    await upsertSave(id, nextState);
    await expect(loadSave(id)).resolves.toMatchObject({
      turn_number: state.turn_number + 1,
    });
  });

  it("does not use volatile memory saves in production unless explicitly enabled", async () => {
    vi.stubEnv("NODE_ENV", "production");
    insertSingle.mockResolvedValueOnce({
      data: null,
      error: {
        code: "PGRST204",
        message: "Could not find the 'turn_number' column",
      },
    });

    const state = createCharacter("王", "humble_scholar", createRng(9));

    await expect(createSave(state)).rejects.toThrow("persistence_unavailable");
  });
});
