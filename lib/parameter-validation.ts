import { SPEC_BY_KEY } from "@/lib/parameter-specs";
import type {
  NeuronParameters,
  ParameterKey,
  ValidationIssue,
  ValidationResult,
} from "@/lib/simulation-types";

const PARAMETER_KEYS = Object.keys(SPEC_BY_KEY) as ParameterKey[];

export function validateParameters(parameters: NeuronParameters): ValidationResult {
  const issues: ValidationIssue[] = [];

  for (const key of PARAMETER_KEYS) {
    const spec = SPEC_BY_KEY[key];
    const value = parameters[key];
    if (!Number.isFinite(value)) {
      issues.push({
        field: key,
        severity: "error",
        message: `${spec.label} must be a finite number.`,
      });
      continue;
    }
    if (value < spec.min || value > spec.max) {
      issues.push({
        field: key,
        severity: "error",
        message: `${spec.label} must stay between ${spec.min} and ${spec.max} ${spec.unit}. ${value} was not applied.`,
      });
    }
  }

  if (
    Number.isFinite(parameters.firingThreshold) &&
    Number.isFinite(parameters.restingPotential) &&
    parameters.firingThreshold <= parameters.restingPotential
  ) {
    issues.push({
      field: "firingThreshold",
      severity: "warning",
      message:
        "Firing threshold is at or below the resting potential. The model can spike from its initial voltage, which is an unusual setting for this demo.",
    });
  }

  if (
    Number.isFinite(parameters.refractoryPeriod) &&
    Number.isFinite(parameters.simulationDuration) &&
    parameters.refractoryPeriod > parameters.simulationDuration
  ) {
    issues.push({
      field: "refractoryPeriod",
      severity: "warning",
      message:
        "The refractory period is longer than the simulation, so at most one spike can be recorded.",
    });
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    issues,
  };
}

export class SimulationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SimulationError";
  }
}

/** Physical checks used by the integrator. Slider bounds are enforced separately. */
export function assertRunnable(
  parameters: NeuronParameters,
  dt: number,
): void {
  const values = Object.values(parameters);
  if (values.some((value) => !Number.isFinite(value))) {
    throw new SimulationError("Every parameter must be a finite number.");
  }
  if (!(parameters.membraneTimeConstant > 0)) {
    throw new SimulationError("Membrane time constant must be positive.");
  }
  if (!(parameters.membraneResistance > 0)) {
    throw new SimulationError("Membrane resistance must be positive.");
  }
  if (!(parameters.simulationDuration > 0)) {
    throw new SimulationError("Simulation duration must be positive.");
  }
  if (!(parameters.refractoryPeriod >= 0)) {
    throw new SimulationError("Refractory period cannot be negative.");
  }
  if (!(dt > 0) || !Number.isFinite(dt)) {
    throw new SimulationError("Time step must be a positive finite number.");
  }
}
