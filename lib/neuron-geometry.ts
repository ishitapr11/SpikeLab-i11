import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { AnatomyId } from "@/lib/anatomy";

/*
  Procedural neuron, laid out like a classic ink plate: a stellate soma with dendrites
  radiating all round it, and a long myelinated axon running to the right (+x) that ends
  in a fan of terminal branches.

  Every geometry carries two extra attributes used by the engraving shader:
    aHatch  (x: cross-contour coordinate, y: lengthwise coordinate), in hatch-line units
    aAlong  position along the axon, 0 at the hillock and 1 at the last myelin-free
            stretch, up to 1.1 at the terminal tips. -1 everywhere else.
*/

export type Quality = "high" | "low";
export type Vec3 = [number, number, number];

export interface NucleusShape {
  center: Vec3;
  radius: number;
  nucleolus: Vec3;
  nucleolusRadius: number;
}

export interface NeuronAssets {
  soma: THREE.BufferGeometry;
  dendrites: THREE.BufferGeometry;
  axon: THREE.BufferGeometry;
  myelin: THREE.BufferGeometry;
  nodes: THREE.BufferGeometry;
  terminals: THREE.BufferGeometry;
  nucleusHit: THREE.BufferGeometry;
  nucleus: NucleusShape;
  anchors: Record<AnatomyId, Vec3>;
  axonCurve: THREE.CatmullRomCurve3;
  /** Along-values of the node centres, in order, used by the saltatory pulse. */
  nodeStops: number[];
  myelinStart: number;
  myelinEnd: number;
}

const SOMA_RADIUS = 0.62;
const AXON_RADIUS = 0.062;
const MYELIN_RADIUS = 0.2;
const LINE_SPACING = 0.03;
const RING_SPACING = 0.042;

/** Small deterministic PRNG so the cell is identical on every load. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface TubeOptions {
  radius: (t: number) => number;
  segments: number;
  radial: number;
  along?: (t: number) => number;
  ringSpacing?: number;
}

/** A tube with radial normals and seam-duplicated vertices so the hatch coordinates stay continuous. */
function buildTube(curve: THREE.Curve<THREE.Vector3>, options: TubeOptions): THREE.BufferGeometry {
  const { radius, segments, radial } = options;
  const ringSpacing = options.ringSpacing ?? RING_SPACING;
  const length = curve.getLength();
  const frames = curve.computeFrenetFrames(segments, false);
  let meanRadius = 0;
  for (let index = 0; index <= 4; index += 1) meanRadius += radius(index / 4) / 5;
  const lineCount = Math.max(3, Math.round((Math.PI * 2 * meanRadius) / LINE_SPACING));

  const positions: number[] = [];
  const normals: number[] = [];
  const hatch: number[] = [];
  const along: number[] = [];
  const indices: number[] = [];
  const center = new THREE.Vector3();

  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    curve.getPointAt(t, center);
    const normal = frames.normals[index];
    const binormal = frames.binormals[index];
    const r = radius(t);
    const alongValue = options.along ? options.along(t) : -1;
    for (let ring = 0; ring <= radial; ring += 1) {
      const angle = (ring / radial) * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const nx = normal.x * cos + binormal.x * sin;
      const ny = normal.y * cos + binormal.y * sin;
      const nz = normal.z * cos + binormal.z * sin;
      positions.push(center.x + nx * r, center.y + ny * r, center.z + nz * r);
      normals.push(nx, ny, nz);
      hatch.push((t * length) / ringSpacing, (ring / radial) * lineCount);
      along.push(alongValue);
    }
  }

  const stride = radial + 1;
  for (let index = 0; index < segments; index += 1) {
    for (let ring = 0; ring < radial; ring += 1) {
      const a = index * stride + ring;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      // Counter-clockwise seen from outside: (b - a) × (c - a) points along the radial normal.
      indices.push(a, b, c, b, d, c);
    }
  }

  return finish(positions, normals, hatch, along, indices);
}

function finish(
  positions: number[],
  normals: number[],
  hatch: number[],
  along: number[],
  indices: number[],
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("aHatch", new THREE.Float32BufferAttribute(hatch, 2));
  geometry.setAttribute("aAlong", new THREE.Float32BufferAttribute(along, 1));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

interface Bulge {
  direction: THREE.Vector3;
  amount: number;
  sharpness: number;
}

/**
 * A lat/long sphere whose poles sit on the x axis, so the meridian hatching flows into the
 * axon hillock. `bulges` pull the surface out into the roots of the processes.
 */
function buildBlob(
  radius: number,
  rings: number,
  sectors: number,
  bulges: Bulge[],
  lumpiness: number,
  options: { along?: number; scale?: Vec3; offset?: Vec3 } = {},
): THREE.BufferGeometry {
  const positions: number[] = [];
  const hatch: number[] = [];
  const along: number[] = [];
  const indices: number[] = [];
  const scale = options.scale ?? [1, 1, 1];
  const offset = options.offset ?? [0, 0, 0];
  const direction = new THREE.Vector3();
  const meridians = Math.max(6, Math.round((Math.PI * 2 * radius) / LINE_SPACING));

  for (let i = 0; i <= rings; i += 1) {
    const theta = (i / rings) * Math.PI;
    for (let j = 0; j <= sectors; j += 1) {
      const phi = (j / sectors) * Math.PI * 2;
      direction.set(Math.cos(theta), Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi));
      let r =
        radius *
        (1 +
          lumpiness *
            (Math.sin(direction.x * 3.1 + 1.3) * Math.cos(direction.y * 2.7 + 0.4) +
              0.6 * Math.sin(direction.z * 5.0 + direction.y * 2.1)));
      for (const bulge of bulges) {
        const c = Math.max(0, direction.dot(bulge.direction));
        r += bulge.amount * Math.pow(c, bulge.sharpness);
      }
      positions.push(
        offset[0] + direction.x * r * scale[0],
        offset[1] + direction.y * r * scale[1],
        offset[2] + direction.z * r * scale[2],
      );
      hatch.push((theta * radius) / RING_SPACING, (j / sectors) * meridians);
      along.push(options.along ?? -1);
    }
  }

  const stride = sectors + 1;
  for (let i = 0; i < rings; i += 1) {
    for (let j = 0; j < sectors; j += 1) {
      const a = i * stride + j;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      if (i !== 0) indices.push(a, c, b);
      if (i !== rings - 1) indices.push(b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  // computeVertexNormals leaves a crease along the seam and at the poles; average them out.
  const normal = geometry.getAttribute("normal") as THREE.BufferAttribute;
  const sum = new THREE.Vector3();
  for (let i = 0; i <= rings; i += 1) {
    const a = i * stride;
    const b = a + sectors;
    sum.set(normal.getX(a) + normal.getX(b), normal.getY(a) + normal.getY(b), normal.getZ(a) + normal.getZ(b));
    sum.normalize();
    normal.setXYZ(a, sum.x, sum.y, sum.z);
    normal.setXYZ(b, sum.x, sum.y, sum.z);
  }
  for (const pole of [0, rings]) {
    const sign = pole === 0 ? 1 : -1;
    for (let j = 0; j <= sectors; j += 1) normal.setXYZ(pole * stride + j, sign, 0, 0);
  }

  geometry.setAttribute("aHatch", new THREE.Float32BufferAttribute(hatch, 2));
  geometry.setAttribute("aAlong", new THREE.Float32BufferAttribute(along, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

interface Branch {
  points: THREE.Vector3[];
  r0: number;
  r1: number;
  flare: number;
  depth: number;
}

function perpendicular(direction: THREE.Vector3, random: () => number): THREE.Vector3 {
  const probe = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5);
  const axis = new THREE.Vector3().crossVectors(direction, probe);
  if (axis.lengthSq() < 1e-6) axis.set(0, 0, 1).cross(direction);
  return axis.normalize();
}

/** Grows a branch as a meandering walk, then splits it into two (sometimes three) daughters. */
function grow(
  origin: THREE.Vector3,
  heading: THREE.Vector3,
  length: number,
  r0: number,
  depth: number,
  maxDepth: number,
  random: () => number,
  out: Branch[],
  spread = 1,
) {
  const steps = 4;
  const points = [origin.clone()];
  const direction = heading.clone().normalize();
  const position = origin.clone();
  const bendAxis = perpendicular(direction, random);
  const bend = (random() - 0.5) * 0.5;
  for (let step = 1; step <= steps; step += 1) {
    direction.applyAxisAngle(bendAxis, bend / steps);
    direction.applyAxisAngle(perpendicular(direction, random), (random() - 0.5) * 0.32);
    direction.normalize();
    position.addScaledVector(direction, length / steps);
    points.push(position.clone());
  }

  const r1 = Math.max(r0 * 0.56, 0.0065);
  out.push({ points, r0, r1, flare: depth === 0 ? 0.13 : 0, depth });

  if (depth === 0) {
    // One short side twig from the middle of each primary dendrite.
    const twigBase = points[2];
    const twigDirection = direction.clone().applyAxisAngle(perpendicular(direction, random), 0.9 + random() * 0.4);
    grow(twigBase, twigDirection, length * 0.45, r0 * 0.38, maxDepth, maxDepth, random, out, spread);
  }

  if (depth >= maxDepth) return;
  const daughters = random() < 0.2 ? 3 : 2;
  const splitAxis = perpendicular(direction, random);
  for (let index = 0; index < daughters; index += 1) {
    const side = daughters === 2 ? (index === 0 ? -1 : 1) : index - 1;
    const angle = (side * (0.34 + random() * 0.26) + (random() - 0.5) * 0.12) * spread;
    const child = direction.clone().applyAxisAngle(splitAxis, angle);
    grow(position, child, length * (0.62 + random() * 0.16), r1 * 0.94, depth + 1, maxDepth, random, out, spread);
  }
}

function branchGeometry(branch: Branch, quality: Quality, along?: (t: number) => number) {
  const curve = new THREE.CatmullRomCurve3(branch.points, false, "centripetal");
  const thick = branch.r0 > 0.04;
  const high = quality === "high";
  return buildTube(curve, {
    segments: high ? (branch.depth === 0 ? 22 : 12) : branch.depth === 0 ? 12 : 7,
    radial: high ? (thick ? 10 : 6) : thick ? 7 : 5,
    radius: (t) => branch.r0 + (branch.r1 - branch.r0) * t + branch.flare * Math.pow(1 - t, 5),
    along,
  });
}

/** Angles (degrees, in the xy plane) of the primary dendrites. The axon leaves at 0°. */
const DENDRITE_ANGLES = [58, 94, 124, 152, 180, 207, 236, 266, 302];

const AXON_POINTS: Vec3[] = [
  [0.5, 0, 0],
  [1.2, 0.04, 0.02],
  [2.2, -0.06, 0.05],
  [3.3, 0.03, -0.04],
  [4.4, -0.05, 0.03],
  [5.5, 0.04, -0.01],
  [6.5, -0.02, 0],
];

const MYELIN_START = 0.16;
const MYELIN_END = 0.9;
const MYELIN_COUNT = 6;
const NODE_GAP = 0.024;

function buildAssets(quality: Quality): NeuronAssets {
  const random = mulberry32(20231);
  const high = quality === "high";

  // --- Dendrites ------------------------------------------------------------
  const branches: Branch[] = [];
  const rootDirections: THREE.Vector3[] = [];
  DENDRITE_ANGLES.forEach((degrees, index) => {
    const angle = (degrees * Math.PI) / 180;
    const tilt = (random() - 0.5) * 0.85;
    const direction = new THREE.Vector3(Math.cos(angle), Math.sin(angle), tilt).normalize();
    rootDirections.push(direction);
    const origin = direction.clone().multiplyScalar(SOMA_RADIUS * 0.72);
    const length = 0.95 + random() * 0.4 + (index % 3 === 0 ? 0.2 : 0);
    grow(origin, direction, length, 0.1 + random() * 0.025, 0, high ? 3 : 2, random, branches);
  });
  const dendrites = mergeGeometries(branches.map((branch) => branchGeometry(branch, quality)));

  // --- Soma ------------------------------------------------------------------
  const bulges: Bulge[] = rootDirections.map((direction) => ({
    direction,
    amount: 0.2,
    sharpness: 16,
  }));
  bulges.push({ direction: new THREE.Vector3(1, 0, 0), amount: 0.42, sharpness: 9 });
  const soma = buildBlob(SOMA_RADIUS, high ? 56 : 32, high ? 84 : 48, bulges, 0.035, {
    scale: [1, 0.94, 0.86],
  });

  // --- Axon ------------------------------------------------------------------
  const axonCurve = new THREE.CatmullRomCurve3(
    AXON_POINTS.map((point) => new THREE.Vector3(...point)),
    false,
    "centripetal",
  );
  const axonParts: THREE.BufferGeometry[] = [
    buildTube(axonCurve, {
      segments: high ? 240 : 140,
      radial: high ? 10 : 7,
      radius: (t) => AXON_RADIUS + 0.05 * Math.pow(Math.max(0, 1 - t / 0.12), 2) - 0.008 * t,
      along: (t) => t,
    }),
  ];

  // Myelin internodes, separated by nodes of Ranvier.
  const span = (MYELIN_END - MYELIN_START - NODE_GAP * (MYELIN_COUNT - 1)) / MYELIN_COUNT;
  const myelinParts: THREE.BufferGeometry[] = [];
  const nodeParts: THREE.BufferGeometry[] = [];
  const nodeStops: number[] = [];
  const beadMiddles: number[] = [];
  for (let index = 0; index < MYELIN_COUNT; index += 1) {
    const t0 = MYELIN_START + index * (span + NODE_GAP);
    const t1 = t0 + span;
    beadMiddles.push((t0 + t1) / 2);
    const points: THREE.Vector3[] = [];
    for (let k = 0; k <= 14; k += 1) points.push(axonCurve.getPointAt(t0 + ((t1 - t0) * k) / 14));
    const beadRadius = MYELIN_RADIUS * (0.92 + random() * 0.14);
    myelinParts.push(
      buildTube(new THREE.CatmullRomCurve3(points), {
        segments: high ? 48 : 28,
        radial: high ? 18 : 12,
        radius: (t) => AXON_RADIUS * 0.9 + (beadRadius - AXON_RADIUS * 0.9) * Math.pow(Math.sin(Math.PI * t), 0.42),
        along: (t) => t0 + (t1 - t0) * t,
        ringSpacing: RING_SPACING * 0.9,
      }),
    );
    if (index < MYELIN_COUNT - 1) {
      const g0 = t1 - 0.006;
      const g1 = t1 + NODE_GAP + 0.006;
      nodeStops.push((t1 + t1 + NODE_GAP) / 2);
      const nodePoints: THREE.Vector3[] = [];
      for (let k = 0; k <= 4; k += 1) nodePoints.push(axonCurve.getPointAt(g0 + ((g1 - g0) * k) / 4));
      nodeParts.push(
        buildTube(new THREE.CatmullRomCurve3(nodePoints), {
          segments: 10,
          radial: high ? 10 : 7,
          radius: (t) => AXON_RADIUS * (1.05 + 0.38 * Math.pow(Math.sin(Math.PI * t), 0.35)),
          along: (t) => g0 + (g1 - g0) * t,
          ringSpacing: RING_SPACING * 0.5,
        }),
      );
    }
  }

  // Two thin collaterals leaving at nodes, as in the plate.
  const collaterals: Branch[] = [];
  [
    { stop: nodeStops[1], direction: new THREE.Vector3(0.55, 1, 0.2) },
    { stop: nodeStops[3], direction: new THREE.Vector3(0.6, -1, -0.15) },
  ].forEach(({ stop, direction }) => {
    grow(axonCurve.getPointAt(stop), direction, 0.55, 0.026, 1, 2, random, collaterals, 0.8);
  });
  collaterals.forEach((branch) => axonParts.push(branchGeometry(branch, quality)));

  // --- Terminals -------------------------------------------------------------
  const terminalBranches: Branch[] = [];
  const end = axonCurve.getPointAt(1);
  const endTangent = axonCurve.getTangentAt(1);
  [-0.55, -0.15, 0.25, 0.6].forEach((angle, index) => {
    const direction = endTangent
      .clone()
      .applyAxisAngle(new THREE.Vector3(0, 0, 1), angle)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), (index % 2 === 0 ? 1 : -1) * 0.25);
    grow(end, direction, 0.5, 0.042, 1, high ? 3 : 2, random, terminalBranches, 0.9);
  });
  const terminalParts = terminalBranches.map((branch) =>
    branchGeometry(branch, quality, (t) => 1 + 0.035 * (branch.depth - 1 + t)),
  );
  const boutonTips = terminalBranches
    .filter((branch) => branch.depth === (high ? 3 : 2))
    .map((branch) => branch.points[branch.points.length - 1]);
  boutonTips.forEach((tip) => {
    terminalParts.push(
      buildBlob(0.05, high ? 10 : 7, high ? 14 : 9, [], 0.06, {
        along: 1.1,
        offset: [tip.x, tip.y, tip.z],
      }),
    );
  });

  // --- Nucleus (drawn through the soma by the shader) -------------------------
  const nucleus: NucleusShape = {
    center: [-0.05, 0.03, 0.05],
    radius: 0.27,
    nucleolus: [0.02, 0.08, 0.14],
    nucleolusRadius: 0.065,
  };
  const nucleusHit = new THREE.SphereGeometry(nucleus.radius, 16, 12);
  nucleusHit.translate(...nucleus.center);

  // --- Label anchors ----------------------------------------------------------
  const upper = branches.find((branch) => branch.depth === 0 && branch.points[2].y > 0.9 && branch.points[2].x < 0);
  const dendriteAnchor = (upper ?? branches[0]).points[3];
  const bead = axonCurve.getPointAt(beadMiddles[2]);
  const node = axonCurve.getPointAt(nodeStops[1]);
  const ais = axonCurve.getPointAt(0.07);
  const tip = boutonTips[Math.min(1, boutonTips.length - 1)] ?? end;
  const anchors: Record<AnatomyId, Vec3> = {
    soma: [0.05, SOMA_RADIUS * 0.9, 0.22],
    nucleus: [nucleus.center[0], nucleus.center[1] - 0.06, SOMA_RADIUS * 0.82],
    dendrites: [dendriteAnchor.x, dendriteAnchor.y, dendriteAnchor.z],
    axon: [ais.x, ais.y + AXON_RADIUS * 1.6, ais.z],
    myelin: [bead.x, bead.y + MYELIN_RADIUS, bead.z],
    nodes: [node.x, node.y - AXON_RADIUS * 1.4, node.z],
    terminals: [tip.x, tip.y, tip.z],
  };

  return {
    soma,
    dendrites,
    axon: mergeGeometries(axonParts),
    myelin: mergeGeometries(myelinParts),
    nodes: mergeGeometries(nodeParts),
    terminals: mergeGeometries(terminalParts),
    nucleusHit,
    nucleus,
    anchors,
    axonCurve,
    nodeStops,
    myelinStart: MYELIN_START,
    myelinEnd: MYELIN_END,
  };
}

const cache = new Map<Quality, NeuronAssets>();

export function getNeuronAssets(quality: Quality): NeuronAssets {
  const existing = cache.get(quality);
  if (existing) return existing;
  const assets = buildAssets(quality);
  cache.set(quality, assets);
  return assets;
}
