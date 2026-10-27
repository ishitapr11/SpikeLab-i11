export type StoryPhase = "anatomy" | "signalling" | "parameters";

/**
 * One framing of the neuron. The camera always looks at `focus` (a point in the neuron's own
 * coordinates), and backs off until a `fitW` × `fitH` window around it fills the part of the
 * screen given by `frameX/frameY` (centre, in normalised device coordinates) and
 * `frameW/frameH` (fractions of the viewport).
 */
export interface CameraPose {
  at: number;
  focus: [number, number, number];
  fitW: number;
  fitH: number;
  frameX: number;
  frameY: number;
  frameW: number;
  frameH: number;
  /** In-plane tilt of the drawing, radians. */
  rotZ: number;
  /** Camera azimuth and elevation around the focus, radians. */
  azimuth: number;
  elevation: number;
}

type PoseValues = Omit<CameraPose, "at">;

const FULL: PoseValues = {
  focus: [1.9, 0.7, 0],
  fitW: 11.2,
  fitH: 7.3,
  frameX: -0.44,
  frameY: 0,
  frameW: 0.52,
  frameH: 0.8,
  rotZ: -0.36,
  azimuth: 0.16,
  elevation: 0.1,
};

const CLOSE: PoseValues = {
  focus: [2.4, 0.1, 0],
  fitW: 6.6,
  fitH: 4.4,
  frameX: 0.48,
  frameY: 0,
  frameW: 0.52,
  frameH: 0.8,
  rotZ: 0,
  azimuth: 0.42,
  elevation: 0.2,
};

const CENTRED: PoseValues = {
  focus: [2.45, 0, 0],
  fitW: 5.8,
  fitH: 10.8,
  frameX: 0,
  frameY: 0.02,
  frameW: 0.34,
  frameH: 0.7,
  rotZ: -Math.PI / 2,
  azimuth: 0.1,
  elevation: 0.12,
};

/** On narrow screens the canvas is its own band above the text, so it is framed whole. */
const COMPACT_OVERRIDES: Record<"full" | "close" | "centred", Partial<PoseValues>> = {
  full: { frameX: 0, frameY: 0, frameW: 0.96, frameH: 0.86 },
  close: { frameX: 0, frameY: 0, frameW: 0.96, frameH: 0.86 },
  centred: { frameX: 0, frameY: 0, frameW: 0.96, frameH: 0.86, rotZ: -0.36, fitW: 11.2, fitH: 7.3, focus: [1.9, 0.7, 0] },
};

function poses(compact: boolean): CameraPose[] {
  const full = compact ? { ...FULL, ...COMPACT_OVERRIDES.full } : FULL;
  const close = compact ? { ...CLOSE, ...COMPACT_OVERRIDES.close } : CLOSE;
  const centred = compact ? { ...CENTRED, ...COMPACT_OVERRIDES.centred } : CENTRED;
  return [
    { at: 0, ...full },
    { at: 0.22, ...full },
    { at: 0.46, ...close },
    { at: 0.62, ...close },
    { at: 0.84, ...centred },
    { at: 1, ...centred },
  ];
}

const DESKTOP_POSES = poses(false);
const COMPACT_POSES = poses(true);

export const PHASE_SCROLL: Record<StoryPhase, number> = {
  anatomy: 0.04,
  signalling: 0.54,
  parameters: 0.9,
};

export function phaseFromProgress(progress: number): StoryPhase {
  if (progress < 0.36) return "anatomy";
  if (progress < 0.7) return "signalling";
  return "parameters";
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return clamped * clamped * (3 - 2 * clamped);
}

function mix(start: CameraPose, end: CameraPose, t: number, at: number): CameraPose {
  return {
    at,
    focus: [
      lerp(start.focus[0], end.focus[0], t),
      lerp(start.focus[1], end.focus[1], t),
      lerp(start.focus[2], end.focus[2], t),
    ],
    fitW: lerp(start.fitW, end.fitW, t),
    fitH: lerp(start.fitH, end.fitH, t),
    frameX: lerp(start.frameX, end.frameX, t),
    frameY: lerp(start.frameY, end.frameY, t),
    frameW: lerp(start.frameW, end.frameW, t),
    frameH: lerp(start.frameH, end.frameH, t),
    rotZ: lerp(start.rotZ, end.rotZ, t),
    azimuth: lerp(start.azimuth, end.azimuth, t),
    elevation: lerp(start.elevation, end.elevation, t),
  };
}

export function samplePose(progress: number, reduced: boolean, compact = false): CameraPose {
  const list = compact ? COMPACT_POSES : DESKTOP_POSES;
  const p = Math.min(1, Math.max(0, progress));
  if (reduced) {
    if (p < 0.36) return list[0];
    if (p < 0.7) return list[2];
    return list[4];
  }

  for (let index = 0; index < list.length - 1; index += 1) {
    const start = list[index];
    const end = list[index + 1];
    if (p <= end.at || index === list.length - 2) {
      const span = end.at - start.at;
      const t = span <= 0 ? 0 : smoothstep((p - start.at) / span);
      return mix(start, end, t, p);
    }
  }
  return list[0];
}

/** Distance at which the pose's window fills its share of the viewport. */
export function fitDistance(pose: CameraPose, fovDegrees: number, aspect: number): number {
  const tan = Math.tan((fovDegrees * Math.PI) / 360);
  const byWidth = pose.fitW / (2 * tan * aspect * pose.frameW);
  const byHeight = pose.fitH / (2 * tan * pose.frameH);
  return Math.max(byWidth, byHeight);
}
