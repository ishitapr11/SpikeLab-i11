import type { RefObject } from "react";
import type * as THREE from "three";
import type { AnatomyId } from "@/lib/anatomy";
import type { StoryPhase } from "@/lib/camera-poses";
import type { Quality } from "@/lib/neuron-geometry";

export interface NeuronViewState {
  rotX: number;
  rotY: number;
  zoom: number;
}

export interface NeuronSceneProps {
  progressRef: RefObject<number>;
  viewRef: RefObject<NeuronViewState>;
  reduced: boolean;
  compact: boolean;
  selected: AnatomyId | null;
  onSelect: (id: AnatomyId | null) => void;
  phase: StoryPhase;
  signalRunId: number;
  signalPaused: boolean;
  quality: Quality;
}

export type GroupRef = RefObject<THREE.Group | null>;

export const ZOOM_MIN = 0.55;
export const ZOOM_MAX = 1.6;

export function clampZoom(value: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
}
