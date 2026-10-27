export const ANATOMY_IDS = [
  "soma",
  "nucleus",
  "dendrites",
  "axon",
  "myelin",
  "nodes",
  "terminals",
] as const;

export type AnatomyId = (typeof ANATOMY_IDS)[number];

export interface AnatomyEntry {
  id: AnatomyId;
  label: string;
  summary: string;
}

export const ANATOMY: Record<AnatomyId, AnatomyEntry> = {
  soma: {
    id: "soma",
    label: "Soma",
    summary:
      "The cell body. It contains the nucleus and is where most synaptic input is integrated before a spike is initiated.",
  },
  nucleus: {
    id: "nucleus",
    label: "Nucleus",
    summary:
      "Holds the cell's genetic material. It is not the site of the action potential. Shown here so the soma reads as a cell, not an empty shape.",
  },
  dendrites: {
    id: "dendrites",
    label: "Dendrites",
    summary:
      "Branching processes that collect synaptic input. On a pyramidal cell, an apical tree rises from the soma and basal dendrites spread around its base.",
  },
  axon: {
    id: "axon",
    label: "Axon",
    summary:
      "The output process. In this simplified picture the spike begins near the axon initial segment and travels toward the terminals.",
  },
  myelin: {
    id: "myelin",
    label: "Myelin",
    summary:
      "Insulating segments wrapped around many axons. They let the impulse jump from node to node instead of crawling along the whole membrane.",
  },
  nodes: {
    id: "nodes",
    label: "Nodes of Ranvier",
    summary:
      "Short gaps between myelin segments. Regenerative sodium current is concentrated here during saltatory conduction.",
  },
  terminals: {
    id: "terminals",
    label: "Axon terminals",
    summary:
      "The branched endings where the neuron contacts its targets. The electrical spike triggers chemical release at most of those synapses.",
  },
};

export function isAnatomyId(value: string): value is AnatomyId {
  return (ANATOMY_IDS as readonly string[]).includes(value);
}
