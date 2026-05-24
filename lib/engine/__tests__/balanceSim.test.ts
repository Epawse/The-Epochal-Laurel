import { describe, expect, it } from "vitest";
import { simulateBalance } from "../balanceSim";

describe("balanceSim", () => {
  it("reports first-try pass rates near the design targets", () => {
    const report = simulateBalance(1000, 20260524);

    expect(report.countyFirstTryPassRate).toBeGreaterThanOrEqual(0.45);
    expect(report.countyFirstTryPassRate).toBeLessThanOrEqual(0.75);
    expect(report.provincialFirstTryPassRate).toBeGreaterThanOrEqual(0.15);
    expect(report.provincialFirstTryPassRate).toBeLessThanOrEqual(0.45);
    expect(report.metropolitanFirstTryPassRate).toBeGreaterThanOrEqual(0.05);
    expect(report.metropolitanFirstTryPassRate).toBeLessThanOrEqual(0.25);
    expect(report.singleGenerationZhuangyuanRate).toBeLessThan(0.02);
  });
});
