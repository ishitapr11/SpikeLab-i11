import { DEFAULT_PARAMETERS } from "@/lib/parameter-specs";
import type { NeuronParameters } from "@/lib/simulation-types";

export interface SimulationPreset {
  id: "subthreshold" | "regular" | "high" | "integration";
  label: string;
  description: string;
  parameters: NeuronParameters;
}

export const SIMULATION_PRESETS: readonly SimulationPreset[] = [
  {
    id: "subthreshold",
    label: "Subthreshold",
    description: "A weak current whose steady state stays below threshold.",
    parameters: {
      ...DEFAULT_PARAMETERS,
      inputCurrent: 1,
    },
  },
  {
    id: "regular",
    label: "Regular firing",
    description: "Moderate current that drives repeated threshold crossings.",
    parameters: { ...DEFAULT_PARAMETERS },
  },
  {
    id: "high",
    label: "High stimulation",
    description: "Stronger current. The refractory period becomes the main limit on rate.",
    parameters: {
      ...DEFAULT_PARAMETERS,
      inputCurrent: 8,
    },
  },
  {
    id: "integration",
    label: "Long integration",
    description: "A slower membrane, so voltage approaches steady state more gradually.",
    parameters: {
      ...DEFAULT_PARAMETERS,
      inputCurrent: 2.2,
      membraneTimeConstant: 40,
      simulationDuration: 800,
    },
  },
];
