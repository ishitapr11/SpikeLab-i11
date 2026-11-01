/**
 * Hodgkin-Huxley model of the squid giant axon (1952), in the modern sign
 * convention where rest is about -65 mV.
 *
 * Units: voltage in mV, time in ms, current density in uA/cm^2,
 * conductance in mS/cm^2, capacitance in uF/cm^2.
 *
 *   Cm dV/dt = I - gNa m^3 h (V - ENa) - gK n^4 (V - EK) - gL (V - EL)
 *
 * The gating variables m, h and n each move toward a voltage-dependent
 * steady state: dx/dt = alpha(V) (1 - x) - beta(V) x.
 */

export interface HodgkinHuxleyParameters {
  /** Stimulus current density in uA/cm^2. */
  stimulusCurrent: number;
  /** How long the stimulus stays on, in ms. */
  stimulusDuration: number;
  /** When the stimulus switches on, in ms. */
  stimulusStart: number;
  /** Total length of the recording, in ms. */
  simulationDuration: number;
}

export interface HodgkinHuxleyResult {
  times: number[];
  voltages: number[];
  /** Sodium activation gate, 0 to 1. */
  m: number[];
  /** Sodium inactivation gate, 0 to 1. */
  h: number[];
  /** Potassium activation gate, 0 to 1. */
  n: number[];
  /** Stimulus current at each sample, in uA/cm^2. */
  stimulus: number[];
  spikeTimes: number[];
  spikeCount: number;
  peakVoltage: number;
  timeToFirstSpike: number | null;
  parameters: HodgkinHuxleyParameters;
}

export interface HodgkinHuxleySpec {
  key: "stimulusCurrent" | "stimulusDuration";
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  decimals: number;
}

export const HH_CONSTANTS = {
  membraneCapacitance: 1,
  sodiumConductance: 120,
  potassiumConductance: 36,
  leakConductance: 0.3,
  sodiumReversal: 50,
  potassiumReversal: -77,
  leakReversal: -54.387,
  restingVoltage: -65,
} as const;

/** Integration step in ms. Small, because the sodium gate is fast. */
export const HH_DT_MS = 0.01;
/** One sample is stored every this many ms. */
export const HH_SAMPLE_MS = 0.1;
/** A spike is counted when the voltage crosses this level going up. */
const SPIKE_LEVEL = 0;
/** The spike detector re-arms once the voltage falls below this level. */
const SPIKE_REARM = -20;

export const DEFAULT_HH_PARAMETERS: HodgkinHuxleyParameters = {
  stimulusCurrent: 10,
  stimulusDuration: 40,
  stimulusStart: 5,
  simulationDuration: 60,
};

export const HH_PARAMETER_SPECS: HodgkinHuxleySpec[] = [
  {
    key: "stimulusCurrent",
    label: "Stimulus current",
    unit: "\u00b5A/cm\u00b2",
    min: 0,
    max: 30,
    step: 0.5,
    decimals: 1,
  },
  {
    key: "stimulusDuration",
    label: "Stimulus duration",
    unit: "ms",
    min: 1,
    max: 50,
    step: 1,
    decimals: 0,
  },
];

export const HH_PRESETS: Array<{
  id: string;
  label: string;
  stimulusCurrent: number;
  stimulusDuration: number;
}> = [
  { id: "subthreshold", label: "Subthreshold", stimulusCurrent: 1.5, stimulusDuration: 40 },
  { id: "single-spike", label: "Single spike", stimulusCurrent: 10, stimulusDuration: 1 },
  { id: "repeated-firing", label: "Repeated firing", stimulusCurrent: 10, stimulusDuration: 40 },
];

/** x / (1 - exp(-x / y)), with its limit y at x = 0 so there is no divide-by-zero. */
function vtrap(x: number, y: number): number {
  if (Math.abs(x / y) < 1e-6) return y * (1 - x / y / 2);
  return x / (1 - Math.exp(-x / y));
}

const alphaN = (v: number) => 0.01 * vtrap(v + 55, 10);
const betaN = (v: number) => 0.125 * Math.exp(-(v + 65) / 80);
const alphaM = (v: number) => 0.1 * vtrap(v + 40, 10);
const betaM = (v: number) => 4 * Math.exp(-(v + 65) / 18);
const alphaH = (v: number) => 0.07 * Math.exp(-(v + 65) / 20);
const betaH = (v: number) => 1 / (1 + Math.exp(-(v + 35) / 10));

export class HodgkinHuxleyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HodgkinHuxleyError";
  }
}

export function assertHodgkinHuxleyRunnable(parameters: HodgkinHuxleyParameters): void {
  const { stimulusCurrent, stimulusDuration, stimulusStart, simulationDuration } = parameters;
  const values = [stimulusCurrent, stimulusDuration, stimulusStart, simulationDuration];
  if (!values.every((value) => Number.isFinite(value))) {
    throw new HodgkinHuxleyError("Every parameter must be a finite number.");
  }
  if (stimulusCurrent < 0 || stimulusDuration < 0 || stimulusStart < 0) {
    throw new HodgkinHuxleyError("Current, duration and start time cannot be negative.");
  }
  if (simulationDuration <= 0) {
    throw new HodgkinHuxleyError("The simulation must last longer than 0 ms.");
  }
}

export function simulateHodgkinHuxley(
  parameters: HodgkinHuxleyParameters = DEFAULT_HH_PARAMETERS,
): HodgkinHuxleyResult {
  assertHodgkinHuxleyRunnable(parameters);

  const { stimulusCurrent, stimulusDuration, stimulusStart, simulationDuration } = parameters;
  const c = HH_CONSTANTS;
  const steps = Math.round(simulationDuration / HH_DT_MS);
  const sampleEvery = Math.max(1, Math.round(HH_SAMPLE_MS / HH_DT_MS));

  let v: number = c.restingVoltage;
  let m = alphaM(v) / (alphaM(v) + betaM(v));
  let h = alphaH(v) / (alphaH(v) + betaH(v));
  let n = alphaN(v) / (alphaN(v) + betaN(v));

  const times: number[] = [];
  const voltages: number[] = [];
  const mTrace: number[] = [];
  const hTrace: number[] = [];
  const nTrace: number[] = [];
  const stimulus: number[] = [];
  const spikeTimes: number[] = [];
  let peakVoltage = v;
  let armed = true;

  for (let i = 0; i <= steps; i += 1) {
    const time = i * HH_DT_MS;
    const stimulusNow =
      time >= stimulusStart && time < stimulusStart + stimulusDuration ? stimulusCurrent : 0;

    if (i % sampleEvery === 0) {
      times.push(time);
      voltages.push(v);
      mTrace.push(m);
      hTrace.push(h);
      nTrace.push(n);
      stimulus.push(stimulusNow);
    }
    if (i === steps) break;

    const sodiumCurrent = c.sodiumConductance * m * m * m * h * (v - c.sodiumReversal);
    const potassiumCurrent = c.potassiumConductance * n * n * n * n * (v - c.potassiumReversal);
    const leakCurrent = c.leakConductance * (v - c.leakReversal);
    const dv = (stimulusNow - sodiumCurrent - potassiumCurrent - leakCurrent) / c.membraneCapacitance;

    const dm = alphaM(v) * (1 - m) - betaM(v) * m;
    const dh = alphaH(v) * (1 - h) - betaH(v) * h;
    const dn = alphaN(v) * (1 - n) - betaN(v) * n;

    v += HH_DT_MS * dv;
    m += HH_DT_MS * dm;
    h += HH_DT_MS * dh;
    n += HH_DT_MS * dn;

    if (v > peakVoltage) peakVoltage = v;
    if (armed && v > SPIKE_LEVEL) {
      spikeTimes.push((i + 1) * HH_DT_MS);
      armed = false;
    } else if (!armed && v < SPIKE_REARM) {
      armed = true;
    }
  }

  return {
    times,
    voltages,
    m: mTrace,
    h: hTrace,
    n: nTrace,
    stimulus,
    spikeTimes,
    spikeCount: spikeTimes.length,
    peakVoltage,
    timeToFirstSpike: spikeTimes.length > 0 ? spikeTimes[0] : null,
    parameters,
  };
}
