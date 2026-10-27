import { steadyStateRheobase } from "@/lib/neuron-model";
import type { NeuronParameters, SimulationResult } from "@/lib/simulation-types";

export function buildInsights(
  parameters: NeuronParameters,
  result: SimulationResult,
): string[] {
  const notes: string[] = [];
  const vInf = result.steadyStateVoltage;

  notes.push(
    `With this constant current the passive steady state is ${vInf.toFixed(1)} mV (Vrest + Rm I).`,
  );

  if (result.spikeCount === 0) {
    notes.push("The membrane voltage remains below threshold for the entire simulation.");
    if (vInf < parameters.firingThreshold) {
      notes.push(
        "Because that steady state is below threshold, waiting longer would not produce a spike at this current.",
      );
    } else {
      notes.push(
        "The steady state is at or above threshold, but the membrane does not get there within this recording.",
      );
    }
  } else if (result.spikeCount === 1) {
    notes.push("The membrane reaches threshold once, then resets and does not fire again in this window.");
  } else {
    const interval = result.meanInterspikeInterval;
    notes.push(
      interval === null
        ? "Repeated threshold crossings produce a spike train."
        : `Repeated threshold crossings produce a regular spike train. The mean interval is ${interval.toFixed(1)} ms.`,
    );
  }

  if (parameters.refractoryPeriod > 0 && result.meanInterspikeInterval !== null) {
    const ceiling = 1000 / parameters.refractoryPeriod;
    if (result.meanInterspikeInterval < parameters.refractoryPeriod * 2.5) {
      notes.push(
        `The ${parameters.refractoryPeriod.toFixed(1)} ms refractory period is a large part of each interval. It caps the rate near ${ceiling.toFixed(0)} spikes/s before adding the time required to reach threshold again.`,
      );
    }
  }

  const rheobase = steadyStateRheobase(parameters);
  if (result.minimumCurrentToFire === null) {
    notes.push("No current from 0 to 10 nA produces a spike within this simulation.");
  } else if (parameters.inputCurrent + 1e-9 < result.minimumCurrentToFire) {
    notes.push(
      `The finite-window minimum current is ${result.minimumCurrentToFire.toFixed(2)} nA. The steady-state rheobase is ${rheobase.toFixed(2)} nA; a short recording can require more current than that asymptote.`,
    );
  }

  return notes.slice(0, 4);
}
