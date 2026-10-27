import { assertRunnable } from "@/lib/parameter-validation";
import type {
  NeuronParameters,
  SimulationOptions,
  SimulationResult,
} from "@/lib/simulation-types";

/**
 * Leaky integrate-and-fire neuron.
 *
 * Subthreshold equation, for constant injected current:
 *   τm dV/dt = -(V - Vrest) + Rm I
 *   V∞ = Vrest + Rm I
 *
 * Over a step with constant current the update is exact:
 *   V(t + Δt) = V∞ + (V(t) - V∞) exp(-Δt / τm)
 *
 * Conventions
 * - Time step defaults to 0.1 ms and does not follow the duration slider.
 * - Reset potential is the resting potential. It is not a separate control.
 * - A spike is recorded when voltage reaches the threshold. Voltage is then
 *   set to the reset potential.
 * - The refractory period is measured from the spike time. Until that instant,
 *   voltage stays at the reset potential and no further spike is emitted.
 * - A zero refractory period cannot loop forever: each spike consumes a time step.
 * - Firing rate is spikeCount / (duration in seconds), using the full window,
 *   including the time before the first spike.
 * - The sampled voltage is the model voltage. Spike peaks are not invented here.
 *   A 0.1 ms reset is a single sample; the chart marks spike times separately.
 */

export const SIM_DT_MS = 0.1;

const CURRENT_SEARCH_MIN = 0;
const CURRENT_SEARCH_MAX = 10;
const CURRENT_SEARCH_TOLERANCE = 0.01;

export function steadyStateVoltage(parameters: NeuronParameters): number {
  return parameters.restingPotential + parameters.membraneResistance * parameters.inputCurrent;
}

export function steadyStateRheobase(parameters: NeuronParameters): number {
  const span = parameters.firingThreshold - parameters.restingPotential;
  if (span <= 0) return 0;
  return span / parameters.membraneResistance;
}

export function firingRateFromCount(spikeCount: number, durationMs: number): number {
  if (!(durationMs > 0)) return 0;
  return spikeCount / (durationMs / 1000);
}

export function meanInterspikeInterval(spikeTimes: number[]): number | null {
  if (spikeTimes.length < 2) return null;
  let total = 0;
  for (let index = 1; index < spikeTimes.length; index += 1) {
    total += spikeTimes[index] - spikeTimes[index - 1];
  }
  return total / (spikeTimes.length - 1);
}

export function simulate(
  parameters: NeuronParameters,
  options: SimulationOptions = {},
): SimulationResult {
  const dt = options.dt ?? SIM_DT_MS;
  const recordTrace = options.recordTrace !== false;
  assertRunnable(parameters, dt);

  const {
    inputCurrent,
    restingPotential,
    firingThreshold,
    membraneTimeConstant,
    membraneResistance,
    refractoryPeriod,
    simulationDuration,
  } = parameters;

  const vInf = restingPotential + membraneResistance * inputCurrent;
  const vReset = restingPotential;
  const spikeTimes: number[] = [];
  let voltage = restingPotential;
  let refractoryUntil = Number.NEGATIVE_INFINITY;

  const emit = (time: number) => {
    spikeTimes.push(time);
    voltage = vReset;
    refractoryUntil = time + refractoryPeriod;
  };

  if (voltage >= firingThreshold) emit(0);

  const times: number[] = [];
  const voltages: number[] = [];
  if (recordTrace) {
    times.push(0);
    voltages.push(voltage);
  }

  let time = 0;
  while (time < simulationDuration - 1e-9) {
    const step = Math.min(dt, simulationDuration - time);
    const timeNext = time + step;

    if (timeNext <= refractoryUntil + 1e-10) {
      voltage = vReset;
    } else {
      let integrateFor = step;
      if (refractoryUntil > time) {
        voltage = vReset;
        integrateFor = timeNext - refractoryUntil;
      }
      const decay = Math.exp(-integrateFor / membraneTimeConstant);
      voltage = vInf + (voltage - vInf) * decay;
      if (voltage >= firingThreshold) emit(timeNext);
    }

    time = timeNext;
    if (recordTrace) {
      times.push(time);
      voltages.push(voltage);
    }
  }

  let voltageMin = voltage;
  let voltageMax = voltage;
  if (recordTrace) {
    voltageMin = voltages[0] ?? voltage;
    voltageMax = voltageMin;
    for (const sample of voltages) {
      if (sample < voltageMin) voltageMin = sample;
      if (sample > voltageMax) voltageMax = sample;
    }
  }

  const spikeCount = spikeTimes.length;
  return {
    times,
    voltages,
    spikeTimes,
    spikeCount,
    firingRate: firingRateFromCount(spikeCount, simulationDuration),
    minimumCurrentToFire: options.includeMinimumCurrent
      ? minimumCurrentToFire(parameters, { dt })
      : null,
    steadyStateVoltage: vInf,
    steadyStateRheobase: steadyStateRheobase(parameters),
    meanInterspikeInterval: meanInterspikeInterval(spikeTimes),
    timeToFirstSpike: spikeTimes[0] ?? null,
    voltageMin,
    voltageMax,
    config: parameters,
    dt,
  };
}

export interface CurrentSearchOptions {
  dt?: number;
  minimum?: number;
  maximum?: number;
  tolerance?: number;
}

/**
 * Minimum constant current, inside the searched range, that produces at least
 * one spike before the simulation ends.
 *
 * The search assumes spike count does not decrease as current increases.
 * The returned current is rounded up to the nearest 0.01 nA and is rechecked
 * so that it still fires. Null means even the top of the range does not fire.
 */
export function minimumCurrentToFire(
  parameters: NeuronParameters,
  options: CurrentSearchOptions = {},
): number | null {
  const dt = options.dt ?? SIM_DT_MS;
  const minimum = options.minimum ?? CURRENT_SEARCH_MIN;
  const maximum = options.maximum ?? CURRENT_SEARCH_MAX;
  const tolerance = options.tolerance ?? CURRENT_SEARCH_TOLERANCE;

  const fires = (current: number) =>
    simulate(
      { ...parameters, inputCurrent: current },
      { dt, recordTrace: false },
    ).spikeCount > 0;

  if (!fires(maximum)) return null;
  if (fires(minimum)) return minimum;

  let low = minimum;
  let high = maximum;
  while (high - low > tolerance) {
    const mid = (low + high) / 2;
    if (fires(mid)) high = mid;
    else low = mid;
  }

  const rounded = Math.ceil((high - 1e-9) * 100) / 100;
  if (fires(rounded)) return rounded;
  if (fires(high)) return high;
  return maximum;
}
