"use client";

import { useDeferredValue, useMemo } from "react";
import { firingRateCurve } from "@/lib/firing-rate";
import { buildInsights } from "@/lib/insights";
import { minimumCurrentToFire, simulate } from "@/lib/neuron-model";
import { validateParameters } from "@/lib/parameter-validation";
import type { FiringRatePoint, NeuronParameters, SimulationResult, ValidationResult } from "@/lib/simulation-types";

export interface NeuronSimulationState {
  validation: ValidationResult;
  result: SimulationResult | null;
  curve: FiringRatePoint[];
  insights: string[];
  curvePending: boolean;
}

export function useNeuronSimulation(parameters: NeuronParameters): NeuronSimulationState {
  const validation = useMemo(() => validateParameters(parameters), [parameters]);
  const deferred = useDeferredValue(parameters);

  const result = useMemo(() => {
    if (!validation.valid) return null;
    try {
      const simulation = simulate(parameters);
      return {
        ...simulation,
        minimumCurrentToFire: minimumCurrentToFire(parameters),
      };
    } catch {
      return null;
    }
  }, [parameters, validation.valid]);

  const curve = useMemo(() => {
    if (!validateParameters(deferred).valid) return [];
    try {
      return firingRateCurve(deferred);
    } catch {
      return [];
    }
  }, [deferred]);

  const insights = useMemo(
    () => (result ? buildInsights(parameters, result) : []),
    [parameters, result],
  );

  return {
    validation,
    result,
    curve,
    insights,
    curvePending: deferred !== parameters,
  };
}
