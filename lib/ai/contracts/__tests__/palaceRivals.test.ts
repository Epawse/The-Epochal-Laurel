import { describe, expect, it } from "vitest";
import { getRivalStrength } from "../palaceRivals";

describe("palaceRivals", () => {
  it("uses the recalibrated rival strength bands", () => {
    expect(getRivalStrength(1)).toBe("moderate");
    expect(getRivalStrength(2)).toBe("moderate");
    expect(getRivalStrength(3)).toBe("strong");
    expect(getRivalStrength(4)).toBe("strong");
    expect(getRivalStrength(5)).toBe("elite");
  });
});
