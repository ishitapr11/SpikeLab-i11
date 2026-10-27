import { simulate } from "@/lib/neuron-model";
import type { FiringRatePoint, NeuronParameters } from "@/lib/simulation-types";

/** Currents sampled for the f–I curve, in nA. Inclusive of both ends. */
export function defaultCurrentSamples(minimum = 0, maximum = 10, step = 0.5): number[] {
  if (!(step > 0)) return [minimum];
  const samples: number[] = [];
  const count = Math.round((maximum - minimum) / step);
  for (let index = 0; index <= count; index += 1) {
    const value = minimum + index * step;
    samples.push(Math.round(value * 1000) / 1000);
  }
  return samples;
}

/**
 * Firing rate at each tested current. Every point is a fresh run of the same
 * integrator used by the voltage trace. Other parameters stay fixed.
 */
export function firingRateCurve(
  parameters: NeuronParameters,
  currents: number[] = defaultCurrentSamples(),
): FiringRatePoint[] {
  return currents.map((current) => {
    const result = simulate(
      { ...parameters, inputCurrent: current },
      { recordTrace: false },
    );
    return {
      current,
      firingRate: result.firingRate,
      spikeCount: result.spikeCount,
    };
  });
}
