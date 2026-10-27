import { describe, expect, it } from "vitest";
import { downsampleTrace } from "@/lib/chart-data";
import { firingRateCurve } from "@/lib/firing-rate";
import {
  SIM_DT_MS,
  firingRateFromCount,
  minimumCurrentToFire,
  simulate,
  steadyStateRheobase,
  steadyStateVoltage,
} from "@/lib/neuron-model";
import { SimulationError, assertRunnable } from "@/lib/parameter-validation";
import { DEFAULT_PARAMETERS } from "@/lib/parameter-specs";
import { SIMULATION_PRESETS } from "@/lib/simulation-presets";
import type { NeuronParameters } from "@/lib/simulation-types";

function withParams(overrides: Partial<NeuronParameters> = {}): NeuronParameters {
  return { ...DEFAULT_PARAMETERS, ...overrides };
}

describe("leaky integrate-and-fire model", () => {
  it("matches the analytical constant-current update before threshold", () => {
    const parameters = withParams({
      inputCurrent: 1.2,
      firingThreshold: -20,
      simulationDuration: 20,
    });
    const result = simulate(parameters);
    const vInf = steadyStateVoltage(parameters);
    const expected =
      vInf + (parameters.restingPotential - vInf) * Math.exp(-SIM_DT_MS / parameters.membraneTimeConstant);
    expect(result.voltages[1]).toBeCloseTo(expected, 10);
    expect(result.spikeCount).toBe(0);
  });

  it("produces no spikes in a subthreshold configuration", () => {
    const parameters = withParams({ inputCurrent: 1 });
    const result = simulate(parameters);
    expect(steadyStateVoltage(parameters)).toBeLessThan(parameters.firingThreshold);
    expect(result.spikeCount).toBe(0);
    expect(result.spikeTimes).toEqual([]);
    expect(result.firingRate).toBe(0);
    expect(result.timeToFirstSpike).toBeNull();
    expect(result.meanInterspikeInterval).toBeNull();
  });

  it("produces spikes in a suprathreshold configuration", () => {
    const result = simulate(DEFAULT_PARAMETERS);
    expect(result.spikeCount).toBeGreaterThan(2);
    expect(result.firingRate).toBeGreaterThan(0);
    expect(result.timeToFirstSpike).not.toBeNull();
  });

  it("fires just above a finite-window boundary and stays quiet just below it", () => {
    const quiet = simulate(withParams({ inputCurrent: 1.2, simulationDuration: 200 }));
    const active = simulate(withParams({ inputCurrent: 4, simulationDuration: 200 }));
    expect(quiet.spikeCount).toBe(0);
    expect(active.spikeCount).toBeGreaterThan(0);
  });

  it("increases firing rate when current increases", () => {
    const low = simulate(withParams({ inputCurrent: 3 }));
    const high = simulate(withParams({ inputCurrent: 7 }));
    expect(high.firingRate).toBeGreaterThan(low.firingRate);
    expect(high.spikeCount).toBeGreaterThan(low.spikeCount);
  });

  it("does not fire faster when the refractory period is lengthened", () => {
    const brief = simulate(withParams({ inputCurrent: 8, refractoryPeriod: 2 }));
    const longer = simulate(withParams({ inputCurrent: 8, refractoryPeriod: 8 }));
    expect(longer.firingRate).toBeLessThan(brief.firingRate);
    const ceiling = (refractory: number, duration: number) => 1000 / refractory + 1000 / duration;
    expect(brief.firingRate).toBeLessThanOrEqual(ceiling(2, brief.config.simulationDuration) + 1e-6);
    expect(longer.firingRate).toBeLessThanOrEqual(ceiling(8, longer.config.simulationDuration) + 1e-6);
  });

  it("raises steady-state voltage when membrane resistance increases", () => {
    const low = withParams({ inputCurrent: 1, membraneResistance: 5, firingThreshold: -40 });
    const high = withParams({ inputCurrent: 1, membraneResistance: 12, firingThreshold: -40 });
    expect(steadyStateVoltage(high)).toBeGreaterThan(steadyStateVoltage(low));
    const lowRun = simulate({ ...low, simulationDuration: 200 });
    const highRun = simulate({ ...high, simulationDuration: 200 });
    expect(lowRun.spikeCount).toBe(0);
    expect(highRun.spikeCount).toBe(0);
    const lowFinal = lowRun.voltages[lowRun.voltages.length - 1];
    const highFinal = highRun.voltages[highRun.voltages.length - 1];
    expect(highFinal).toBeGreaterThan(lowFinal);
    expect(highFinal).toBeCloseTo(steadyStateVoltage(high), 1);
  });

  it("finishes when the refractory period is zero", () => {
    const result = simulate(
      withParams({
        inputCurrent: 10,
        refractoryPeriod: 0,
        membraneTimeConstant: 2,
        simulationDuration: 100,
      }),
    );
    expect(result.spikeCount).toBeGreaterThan(0);
    expect(result.spikeCount).toBeLessThan(100_000);
    expect(result.spikeTimes.length).toBe(result.spikeCount);
  });

  it("rejects invalid time constants, resistance, duration, and time steps", () => {
    expect(() => simulate(withParams({ membraneTimeConstant: 0 }))).toThrow(SimulationError);
    expect(() => simulate(withParams({ membraneTimeConstant: -5 }))).toThrow(/time constant/i);
    expect(() => simulate(withParams({ membraneResistance: 0 }))).toThrow(/resistance/i);
    expect(() => simulate(withParams({ membraneResistance: -2 }))).toThrow(SimulationError);
    expect(() => simulate(withParams({ simulationDuration: 0 }))).toThrow(/duration/i);
    expect(() => simulate(withParams({ inputCurrent: Number.NaN }))).toThrow(/finite/i);
    expect(() => simulate(DEFAULT_PARAMETERS, { dt: 0 })).toThrow(/time step/i);
    expect(() => assertRunnable(withParams({ refractoryPeriod: -1 }), 0.1)).toThrow(/refractory/i);
  });

  it("samples time from 0 through the duration at the fixed step", () => {
    const duration = 100;
    const result = simulate(withParams({ simulationDuration: duration, inputCurrent: 0 }));
    expect(result.dt).toBe(SIM_DT_MS);
    expect(result.times[0]).toBe(0);
    expect(result.times[result.times.length - 1]).toBeCloseTo(duration, 8);
    expect(result.times.length).toBe(duration / SIM_DT_MS + 1);
    for (let index = 1; index < result.times.length; index += 1) {
      expect(result.times[index] - result.times[index - 1]).toBeCloseTo(SIM_DT_MS, 8);
    }
    expect(result.voltages.length).toBe(result.times.length);
  });

  it("keeps spike count, spike times, and firing rate consistent", () => {
    const result = simulate(DEFAULT_PARAMETERS);
    expect(result.spikeCount).toBe(result.spikeTimes.length);
    expect(result.firingRate).toBeCloseTo(
      firingRateFromCount(result.spikeCount, result.config.simulationDuration),
      10,
    );
    const sorted = [...result.spikeTimes].sort((a, b) => a - b);
    expect(result.spikeTimes).toEqual(sorted);
    for (let index = 1; index < result.spikeTimes.length; index += 1) {
      expect(result.spikeTimes[index] - result.spikeTimes[index - 1]).toBeGreaterThanOrEqual(
        DEFAULT_PARAMETERS.refractoryPeriod - 1e-6,
      );
    }
  });

  it("reports a finite-window minimum current that matches its definition", () => {
    const parameters = withParams({ simulationDuration: 400 });
    const minimum = minimumCurrentToFire(parameters);
    expect(minimum).not.toBeNull();
    if (minimum === null) return;
    expect(minimum).toBeGreaterThan(steadyStateRheobase(parameters) - 0.02);
    const atMinimum = simulate({ ...parameters, inputCurrent: minimum }, { recordTrace: false });
    expect(atMinimum.spikeCount).toBeGreaterThan(0);
    if (minimum > 0) {
      const below = simulate(
        { ...parameters, inputCurrent: Math.max(0, minimum - 0.02) },
        { recordTrace: false },
      );
      expect(below.spikeCount).toBe(0);
    }
  });

  it("returns null when nothing in the searched range fires", () => {
    const minimum = minimumCurrentToFire(
      withParams({
        inputCurrent: 0,
        restingPotential: -80,
        firingThreshold: -40,
        membraneResistance: 1,
        membraneTimeConstant: 50,
        simulationDuration: 100,
      }),
    );
    expect(minimum).toBeNull();
    const result = simulate(
      withParams({
        inputCurrent: 10,
        restingPotential: -80,
        firingThreshold: -40,
        membraneResistance: 1,
        membraneTimeConstant: 50,
        simulationDuration: 100,
      }),
      { includeMinimumCurrent: true },
    );
    expect(result.spikeCount).toBe(0);
    expect(result.firingRate).toBe(0);
    expect(result.minimumCurrentToFire).toBeNull();
  });

  it("repeats exactly for the same parameters", () => {
    const first = simulate(DEFAULT_PARAMETERS);
    const second = simulate(DEFAULT_PARAMETERS);
    expect(second.spikeTimes).toEqual(first.spikeTimes);
    expect(second.voltages).toEqual(first.voltages);
    expect(second.firingRate).toBe(first.firingRate);
  });

  it("resets to rest at each spike sample rather than drawing a fake peak", () => {
    const result = simulate(DEFAULT_PARAMETERS);
    expect(result.spikeTimes.length).toBeGreaterThan(0);
    for (const spikeTime of result.spikeTimes) {
      const index = result.times.findIndex((time) => Math.abs(time - spikeTime) < 1e-8);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(result.voltages[index]).toBeCloseTo(DEFAULT_PARAMETERS.restingPotential, 6);
    }
  });
});

describe("presets and firing-rate curve", () => {
  it("uses valid preset parameters with the labelled behaviour", () => {
    for (const preset of SIMULATION_PRESETS) {
      expect(() => simulate(preset.parameters)).not.toThrow();
    }
    const sub = simulate(SIMULATION_PRESETS[0].parameters);
    const regular = simulate(SIMULATION_PRESETS[1].parameters);
    const high = simulate(SIMULATION_PRESETS[2].parameters);
    const slow = simulate(SIMULATION_PRESETS[3].parameters);
    expect(sub.spikeCount).toBe(0);
    expect(regular.spikeCount).toBeGreaterThan(1);
    expect(high.firingRate).toBeGreaterThan(regular.firingRate);
    expect(slow.timeToFirstSpike).not.toBeNull();
    expect(regular.timeToFirstSpike).not.toBeNull();
    expect(slow.timeToFirstSpike ?? 0).toBeGreaterThan(regular.timeToFirstSpike ?? 0);
  });

  it("builds the f–I curve from the simulator and keeps the zero-rate region", () => {
    const curve = firingRateCurve(DEFAULT_PARAMETERS, [0, 1, 3, 8]);
    expect(curve.map((point) => point.current)).toEqual([0, 1, 3, 8]);
    expect(curve[0].firingRate).toBe(0);
    expect(curve[1].firingRate).toBe(0);
    expect(curve[2].firingRate).toBeGreaterThan(0);
    expect(curve[3].firingRate).toBeGreaterThan(curve[2].firingRate);
    const direct = simulate({ ...DEFAULT_PARAMETERS, inputCurrent: 3 }, { recordTrace: false });
    expect(curve[2].firingRate).toBeCloseTo(direct.firingRate, 10);
    expect(curve[2].spikeCount).toBe(direct.spikeCount);
  });
});

describe("chart downsampling", () => {
  it("keeps the sample at each spike and the sample before it", () => {
    const result = simulate(DEFAULT_PARAMETERS);
    const points = downsampleTrace(result.times, result.voltages, result.spikeTimes, 400);
    expect(points.length).toBeLessThan(result.times.length);
    expect(points[0].time).toBe(0);
    expect(points[points.length - 1].time).toBeCloseTo(DEFAULT_PARAMETERS.simulationDuration, 6);
    for (const spikeTime of result.spikeTimes) {
      const kept = points.some((point) => Math.abs(point.time - spikeTime) < 1e-8);
      expect(kept).toBe(true);
    }
  });
});

describe("steady-state rheobase", () => {
  it("matches (threshold - rest) / resistance", () => {
    expect(steadyStateRheobase(DEFAULT_PARAMETERS)).toBeCloseTo(1.7, 10);
    expect(steadyStateRheobase(withParams({ firingThreshold: -70, restingPotential: -67 }))).toBe(0);
  });
});
