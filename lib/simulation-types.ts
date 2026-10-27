export interface NeuronParameters {
  inputCurrent: number;
  restingPotential: number;
  firingThreshold: number;
  membraneTimeConstant: number;
  membraneResistance: number;
  refractoryPeriod: number;
  simulationDuration: number;
}

export interface SimulationResult {
  times: number[];
  voltages: number[];
  spikeTimes: number[];
  spikeCount: number;
  firingRate: number;
  /** Smallest current in the searched range that fires within the simulation window. */
  minimumCurrentToFire: number | null;
  /** Analytical steady-state voltage, V_rest + R_m I, in mV. */
  steadyStateVoltage: number;
  /**
   * Analytical steady-state rheobase, (V_threshold - V_rest) / R_m, in nA.
   * This is not the finite-window minimum current.
   */
  steadyStateRheobase: number;
  meanInterspikeInterval: number | null;
  timeToFirstSpike: number | null;
  voltageMin: number;
  voltageMax: number;
  config: NeuronParameters;
  dt: number;
}

export interface FiringRatePoint {
  current: number;
  firingRate: number;
  spikeCount: number;
}

export interface SimulationOptions {
  /** Fixed integration step in milliseconds. Defaults to 0.1. */
  dt?: number;
  /** When false, voltage samples are omitted. Spike times are still recorded. */
  recordTrace?: boolean;
  /**
   * When false, skip the minimum-current search.
   * The field is then null. The UI fills it with a dedicated search.
   */
  includeMinimumCurrent?: boolean;
}

export type ParameterKey = keyof NeuronParameters;

export interface ValidationIssue {
  field: ParameterKey | "general";
  severity: "error" | "warning";
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}
