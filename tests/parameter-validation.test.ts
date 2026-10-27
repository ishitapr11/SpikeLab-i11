import { describe, expect, it } from "vitest";
import { validateParameters } from "@/lib/parameter-validation";
import { DEFAULT_PARAMETERS } from "@/lib/parameter-specs";

describe("parameter validation", () => {
  it("accepts the default configuration", () => {
    const result = validateParameters(DEFAULT_PARAMETERS);
    expect(result.valid).toBe(true);
    expect(result.issues.filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("rejects non-finite values and out-of-range controls without clamping", () => {
    const invalid = validateParameters({ ...DEFAULT_PARAMETERS, membraneResistance: 40 });
    expect(invalid.valid).toBe(false);
    expect(invalid.issues.some((issue) => issue.field === "membraneResistance" && issue.message.includes("40"))).toBe(
      true,
    );

    const nan = validateParameters({ ...DEFAULT_PARAMETERS, inputCurrent: Number.NaN });
    expect(nan.valid).toBe(false);
    expect(nan.issues.some((issue) => issue.message.toLowerCase().includes("finite"))).toBe(true);
  });

  it("warns when threshold is not above rest", () => {
    const result = validateParameters({
      ...DEFAULT_PARAMETERS,
      restingPotential: -60,
      firingThreshold: -60,
    });
    expect(result.valid).toBe(true);
    expect(result.issues.some((issue) => issue.severity === "warning")).toBe(true);
  });
});
