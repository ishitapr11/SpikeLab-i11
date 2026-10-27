import * as THREE from "three";
import type { NucleusShape } from "@/lib/neuron-geometry";
import { INK_RGB, PAPER_RGB } from "@/lib/palette";

/*
  Engraving shader. Light comes from the upper left in view space, as in a drawn plate.
  Tone is never rendered as grey fill: it is built from
    - lines that follow the process (lengthwise hatching),
    - cross-contour rings in the deeper shadows,
    - stipple on the soma,
  and every surface is closed by an inverted-hull ink outline of roughly constant pixel width.
*/

const VERTEX = /* glsl */ `
attribute vec2 aHatch;
attribute float aAlong;
varying vec2 vHatch;
varying float vAlong;
varying vec3 vNormalV;
varying vec3 vViewPos;
varying vec3 vLocal;

void main() {
  vHatch = aHatch;
  vAlong = aAlong;
  vLocal = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewPos = mv.xyz;
  vNormalV = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uInk;
uniform vec3 uPaper;
uniform float uTone;
uniform float uEmphasis;
uniform float uStipple;
uniform float uPulse;
uniform float uPulseOn;
uniform float uXray;
uniform vec3 uCamLocal;
uniform vec4 uNucleus;
uniform vec4 uNucleolus;
uniform float uNucleusEmphasis;

varying vec2 vHatch;
varying float vAlong;
varying vec3 vNormalV;
varying vec3 vViewPos;
varying vec3 vLocal;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Coverage of parallel lines centred on every k + 0.5 of coord.
float lines(float coord, float halfWidth) {
  float fw = fwidth(coord);
  float d = abs(fract(coord) - 0.5);
  float m = 1.0 - smoothstep(halfWidth - fw * 0.75, halfWidth + fw * 0.75, d);
  m = mix(m, clamp(halfWidth * 2.0, 0.0, 1.0), smoothstep(0.35, 0.9, fw));
  return m * smoothstep(0.0, 0.035, halfWidth);
}

float stipple(vec2 coord, float density) {
  vec2 cell = floor(coord);
  vec2 f = fract(coord);
  float pick = hash12(cell);
  vec2 centre = vec2(hash12(cell + 17.31), hash12(cell + 41.97)) * 0.56 + 0.22;
  float radius = 0.16 + 0.18 * density;
  float aa = length(fwidth(coord));
  float dotMask = 1.0 - smoothstep(radius - aa * 0.6, radius + aa * 0.6, length(f - centre));
  float on = step(pick, density * 1.25);
  float crisp = on * dotMask;
  float average = density * 0.35;
  return mix(crisp, average, smoothstep(0.45, 0.9, aa)) * smoothstep(0.03, 0.12, density);
}

void main() {
  vec3 n = normalize(vNormalV);
  if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(-vViewPos);
  vec3 l = normalize(vec3(-0.5, 0.72, 0.48));
  float diffuse = max(dot(n, l), 0.0);
  float facing = max(dot(n, v), 0.0);
  float rim = pow(1.0 - facing, 2.2);
  float dark = clamp((1.0 - diffuse) * 0.86 + rim * 0.42 + uTone, 0.0, 1.0);

  float ghost = 1.0 - step(0.5, uEmphasis);
  float selected = step(1.5, uEmphasis);
  dark = mix(dark, dark * 0.5, ghost);
  dark = mix(dark, min(1.0, dark * 1.08 + 0.24), selected);

  float ring = 0.0;
  float nucleolus = 0.0;
  float inNucleus = 0.0;
  if (uXray > 0.5) {
    vec3 dir = normalize(vLocal - uCamLocal);
    vec3 oc = uNucleus.xyz - uCamLocal;
    float tca = dot(oc, dir);
    float dN = sqrt(max(dot(oc, oc) - tca * tca, 0.0));
    float fw = fwidth(dN);
    float width = fw * (uNucleusEmphasis > 1.5 ? 2.4 : 1.1);
    ring = 1.0 - smoothstep(width, width + fw * 1.2, abs(dN - uNucleus.w));
    inNucleus = 1.0 - smoothstep(uNucleus.w - fw, uNucleus.w + fw, dN);
    vec3 oc2 = uNucleolus.xyz - uCamLocal;
    float t2 = dot(oc2, dir);
    float d2 = sqrt(max(dot(oc2, oc2) - t2 * t2, 0.0));
    nucleolus = 1.0 - smoothstep(uNucleolus.w - fw, uNucleolus.w + fw, d2);
    float nucleusTone = uNucleusEmphasis > 1.5 ? 0.62 : (uNucleusEmphasis < 0.5 ? 0.06 : 0.16 + dark * 0.18);
    dark = mix(dark, nucleusTone, inNucleus * 0.9);
  }

  // A slightly unsteady hand: lines meander a little instead of running dead straight.
  float lengthwise = vHatch.y + 0.11 * sin(vHatch.x * 0.85 + vHatch.y * 0.37) + 0.05 * sin(vHatch.x * 2.3);
  float contour = vHatch.x + 0.09 * sin(vHatch.y * 1.6 + vHatch.x * 0.2);

  float lineStart = 0.15 + uStipple * 0.22;
  float a = lines(lengthwise, clamp((dark - lineStart) * 0.5, 0.0, 0.42));
  float b = lines(contour, clamp((dark - 0.55) * 0.55, 0.0, 0.36));
  float ink = max(a, b);
  if (uStipple > 0.0) {
    ink = max(ink, uStipple * stipple(vHatch * vec2(1.25, 1.1), clamp(dark * 1.1 - 0.05, 0.0, 1.0)));
  }

  if (uXray > 0.5) {
    float ringInk = uNucleusEmphasis < 0.5 ? 0.45 : 1.0;
    ink = max(ink, ring * ringInk);
    ink = max(ink, nucleolus * (uNucleusEmphasis < 0.5 ? 0.4 : 0.92));
  }

  if (uPulseOn > 0.5 && vAlong >= 0.0) {
    float pd = abs(vAlong - uPulse);
    float fa = fwidth(vAlong);
    float core = 1.0 - smoothstep(0.009, 0.009 + fa * 1.5, pd);
    float halo = 1.0 - smoothstep(0.01, 0.055, pd);
    ink = max(ink, core);
    ink = max(ink, lines(contour * 1.5, 0.4 * halo));
  }

  vec3 inkColour = mix(uInk, uPaper, ghost * 0.5);
  gl_FragColor = vec4(mix(uPaper, inkColour, clamp(ink, 0.0, 1.0)), 1.0);
}
`;

const OUTLINE_VERTEX = /* glsl */ `
uniform vec2 uResolution;
uniform float uWidth;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec4 clip = projectionMatrix * mv;
  vec3 nv = normalize(normalMatrix * normal);
  vec2 screen = (projectionMatrix * vec4(nv, 0.0)).xy * uResolution;
  float len = length(screen);
  vec2 dir = len > 1e-5 ? screen / len : vec2(0.0);
  // Pen pressure varies smoothly along the stroke.
  float pressure = 0.78 + 0.4 * sin(position.x * 4.1 + position.y * 2.7) * sin(position.z * 3.3 + position.x * 1.9);
  clip.xy += dir * uWidth * pressure * clip.w * 2.0 / uResolution;
  gl_Position = clip;
}
`;

const OUTLINE_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
void main() {
  gl_FragColor = vec4(uColor, 1.0);
}
`;

export const PART_IDS = ["soma", "dendrites", "axon", "myelin", "nodes", "terminals"] as const;
export type PartId = (typeof PART_IDS)[number];

export interface SharedInkUniforms {
  uInk: { value: THREE.Vector3 };
  uPaper: { value: THREE.Vector3 };
  uPulse: { value: number };
  uPulseOn: { value: number };
  uResolution: { value: THREE.Vector2 };
}

export interface InkPart {
  surface: THREE.ShaderMaterial;
  outline: THREE.ShaderMaterial;
}

export interface InkMaterialSet {
  shared: SharedInkUniforms;
  parts: Record<PartId, InkPart>;
  dispose: () => void;
}

const PART_STYLE: Record<PartId, { tone: number; stipple: number; outline: number }> = {
  soma: { tone: 0.02, stipple: 1, outline: 1.7 },
  dendrites: { tone: 0.08, stipple: 0, outline: 1.35 },
  axon: { tone: 0.12, stipple: 0, outline: 1.35 },
  myelin: { tone: -0.02, stipple: 0, outline: 1.6 },
  nodes: { tone: 0.32, stipple: 0, outline: 1.4 },
  terminals: { tone: 0.12, stipple: 0, outline: 1.3 },
};

/** Moves the conduction band drawn on the axon. Pass a negative position to hide it. */
export function setPulse(shared: SharedInkUniforms, position: number) {
  shared.uPulse.value = position;
  shared.uPulseOn.value = position >= 0 ? 1 : 0;
}

export function createInkMaterials(nucleus: NucleusShape): InkMaterialSet {
  const shared: SharedInkUniforms = {
    uInk: { value: new THREE.Vector3(...INK_RGB) },
    uPaper: { value: new THREE.Vector3(...PAPER_RGB) },
    uPulse: { value: -1 },
    uPulseOn: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
  };

  const parts = {} as Record<PartId, InkPart>;
  for (const id of PART_IDS) {
    const style = PART_STYLE[id];
    const surface = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uInk: shared.uInk,
        uPaper: shared.uPaper,
        uPulse: shared.uPulse,
        uPulseOn: shared.uPulseOn,
        uTone: { value: style.tone },
        uEmphasis: { value: 1 },
        uStipple: { value: style.stipple },
        uXray: { value: id === "soma" ? 1 : 0 },
        uCamLocal: { value: new THREE.Vector3(0, 0, 10) },
        uNucleus: { value: new THREE.Vector4(...nucleus.center, nucleus.radius) },
        uNucleolus: { value: new THREE.Vector4(...nucleus.nucleolus, nucleus.nucleolusRadius) },
        uNucleusEmphasis: { value: 1 },
      },
    });
    const outline = new THREE.ShaderMaterial({
      vertexShader: OUTLINE_VERTEX,
      fragmentShader: OUTLINE_FRAGMENT,
      side: THREE.BackSide,
      uniforms: {
        uResolution: shared.uResolution,
        uWidth: { value: style.outline },
        uColor: { value: new THREE.Vector3(...INK_RGB) },
      },
    });
    outline.userData.baseWidth = style.outline;
    parts[id] = { surface, outline };
  }

  return {
    shared,
    parts,
    dispose: () => {
      for (const id of PART_IDS) {
        parts[id].surface.dispose();
        parts[id].outline.dispose();
      }
    },
  };
}

/**
 * Selection is shown the way an illustrator would: the chosen structure is inked darker with a
 * heavier contour, and everything else fades back to a lighter pencil.
 */
export function applyEmphasis(set: InkMaterialSet, selected: string | null, pixelRatio: number) {
  const ghostColour = new THREE.Vector3(...INK_RGB).lerp(new THREE.Vector3(...PAPER_RGB), 0.55);
  for (const id of PART_IDS) {
    const { surface, outline } = set.parts[id];
    const isSelected = selected === id;
    const isGhost = selected !== null && !isSelected && !(id === "soma" && selected === "nucleus");
    surface.uniforms.uEmphasis.value = isSelected ? 2 : isGhost ? 0 : 1;
    const base = outline.userData.baseWidth as number;
    outline.uniforms.uWidth.value = base * pixelRatio * (isSelected ? 1.7 : 1);
    (outline.uniforms.uColor.value as THREE.Vector3).copy(
      isGhost ? ghostColour : new THREE.Vector3(...INK_RGB),
    );
  }
  set.parts.soma.surface.uniforms.uNucleusEmphasis.value =
    selected === "nucleus" ? 2 : selected === null || selected === "soma" ? 1 : 0;
}
