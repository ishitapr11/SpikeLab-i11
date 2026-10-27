import type { NeuronParameters, ParameterKey } from "@/lib/simulation-types";

export interface ParameterSpec {
  key: ParameterKey;
  label: string;
  symbol: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  decimals: number;
  group: "input" | "membrane";
  explanation: string;
}

export const PARAMETER_SPECS: readonly ParameterSpec[] = [
  {
    key: "inputCurrent",
    label: "Input current",
    symbol: "I",
    unit: "nA",
    min: 0,
    max: 10,
    step: 0.01,
    decimals: 2,
    group: "input",
    explanation:
      "Constant current applied to the model neuron for the whole simulation.",
  },
  {
    key: "restingPotential",
    label: "Resting potential",
    symbol: "Vrest",
    unit: "mV",
    min: -80,
    max: -60,
    step: 0.5,
    decimals: 1,
    group: "input",
    explanation:
      "Baseline voltage the membrane returns toward when no extra current is applied. Spikes also reset to this voltage.",
  },
  {
    key: "firingThreshold",
    label: "Firing threshold",
    symbol: "Vth",
    unit: "mV",
    min: -60,
    max: -40,
    step: 0.5,
    decimals: 1,
    group: "input",
    explanation:
      "Voltage at which the model registers a spike and resets. This is not the reset potential.",
  },
  {
    key: "membraneTimeConstant",
    label: "Membrane time constant",
    symbol: "τm",
    unit: "ms",
    min: 2,
    max: 50,
    step: 0.5,
    decimals: 1,
    group: "membrane",
    explanation:
      "How quickly the membrane voltage moves toward its steady state. Larger values integrate input more slowly.",
  },
  {
    key: "membraneResistance",
    label: "Membrane resistance",
    symbol: "Rm",
    unit: "MΩ",
    min: 1,
    max: 20,
    step: 0.1,
    decimals: 1,
    group: "membrane",
    explanation:
      "How strongly a given current shifts the steady-state voltage. Steady state is Vrest + Rm × I.",
  },
  {
    key: "refractoryPeriod",
    label: "Refractory period",
    symbol: "tref",
    unit: "ms",
    min: 0,
    max: 10,
    step: 0.1,
    decimals: 1,
    group: "membrane",
    explanation:
      "Interval after each spike during which another spike cannot occur. Voltage is held at the reset potential.",
  },
  {
    key: "simulationDuration",
    label: "Simulation duration",
    symbol: "T",
    unit: "ms",
    min: 100,
    max: 1000,
    step: 10,
    decimals: 0,
    group: "membrane",
    explanation:
      "Length of the recording. Firing rate is the spike count divided by this duration.",
  },
] as const;

export const SPEC_BY_KEY: Record<ParameterKey, ParameterSpec> = PARAMETER_SPECS.reduce(
  (accumulator, spec) => {
    accumulator[spec.key] = spec;
    return accumulator;
  },
  {} as Record<ParameterKey, ParameterSpec>,
);

export const DEFAULT_PARAMETERS: NeuronParameters = {
  inputCurrent: 3,
  restingPotential: -67,
  firingThreshold: -50,
  membraneTimeConstant: 10,
  membraneResistance: 10,
  refractoryPeriod: 2,
  simulationDuration: 550,
};

export function formatParameter(key: ParameterKey, value: number): string {
  return value.toFixed(SPEC_BY_KEY[key].decimals);
}

export function parametersEqual(a: NeuronParameters, b: NeuronParameters): boolean {
  return (Object.keys(a) as ParameterKey[]).every((key) => a[key] === b[key]);
}
