"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { NeuronAssets } from "@/lib/neuron-geometry";
import { INK_RGB } from "@/lib/palette";
import { setPulse, type SharedInkUniforms } from "@/components/neuron/ink-materials";

const SPARKS = 9;

interface Keyframe {
  position: number;
  /** Seconds spent travelling to this position from the previous one. */
  travel: number;
  /** Seconds spent resting here afterwards. */
  dwell: number;
}

/**
 * A diagram of conduction, not of charge. The impulse moves continuously along the unmyelinated
 * initial segment, then is drawn jumping from node to node across the myelinated stretch.
 */
function schedule(assets: NeuronAssets): Keyframe[] {
  const frames: Keyframe[] = [{ position: 0.015, travel: 0, dwell: 0.35 }];
  frames.push({ position: assets.myelinStart, travel: 0.55, dwell: 0.05 });
  for (const stop of assets.nodeStops) frames.push({ position: stop, travel: 0.12, dwell: 0.3 });
  frames.push({ position: assets.myelinEnd, travel: 0.12, dwell: 0.05 });
  frames.push({ position: 1, travel: 0.35, dwell: 0 });
  frames.push({ position: 1.1, travel: 0.45, dwell: 0.3 });
  return frames;
}

function positionAt(frames: Keyframe[], seconds: number): { position: number; done: boolean; moving: boolean } {
  let clock = 0;
  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index];
    const previous = frames[Math.max(0, index - 1)].position;
    if (seconds < clock + frame.travel) {
      const t = (seconds - clock) / frame.travel;
      const eased = t * t * (3 - 2 * t);
      return { position: previous + (frame.position - previous) * eased, done: false, moving: true };
    }
    clock += frame.travel;
    if (seconds < clock + frame.dwell) return { position: frame.position, done: false, moving: false };
    clock += frame.dwell;
  }
  return { position: frames[frames.length - 1].position, done: true, moving: false };
}

export function ElectricalSignal({
  assets,
  shared,
  runId,
  paused,
  reduced,
}: {
  assets: NeuronAssets;
  shared: SharedInkUniforms;
  runId: number;
  paused: boolean;
  reduced: boolean;
}) {
  const frames = useMemo(() => schedule(assets), [assets]);
  const state = useRef({ seconds: 0, id: runId });
  const lines = useRef<THREE.LineSegments>(null);
  const geometry = useMemo(() => {
    const value = new THREE.BufferGeometry();
    value.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(SPARKS * 6), 3));
    return value;
  }, []);
  const material = useMemo(() => {
    const value = new THREE.LineBasicMaterial({ toneMapped: false });
    value.color.setRGB(INK_RGB[0], INK_RGB[1], INK_RGB[2], THREE.LinearSRGBColorSpace);
    return value;
  }, []);
  const scratch = useMemo(
    () => ({
      point: new THREE.Vector3(),
      tangent: new THREE.Vector3(),
      u: new THREE.Vector3(),
      w: new THREE.Vector3(),
      up: new THREE.Vector3(0, 1, 0),
    }),
    [],
  );

  useEffect(() => {
    return () => {
      setPulse(shared, -1);
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material, shared]);

  useFrame((_, delta) => {
    if (state.current.id !== runId) {
      state.current.id = runId;
      state.current.seconds = 0;
    }
    if (!paused) state.current.seconds += Math.min(delta, 0.05);
    // With reduced motion the impulse is shown resting at the second node instead of travelling.
    const sample = reduced
      ? { position: assets.nodeStops[1], done: false, moving: false }
      : positionAt(frames, state.current.seconds);
    setPulse(shared, sample.done ? -1 : sample.position);

    const segments = lines.current;
    if (!segments) return;
    segments.visible = !sample.done && sample.position <= 1;
    if (!segments.visible) return;

    const { point, tangent, u, w, up } = scratch;
    const t = Math.min(1, Math.max(0, sample.position));
    assets.axonCurve.getPointAt(t, point);
    assets.axonCurve.getTangentAt(t, tangent);
    u.crossVectors(tangent, up).normalize();
    w.crossVectors(tangent, u).normalize();
    const attribute = geometry.getAttribute("position") as THREE.BufferAttribute;
    const flicker = state.current.seconds * 9;
    const inner = sample.moving ? 0.17 : 0.25;
    for (let index = 0; index < SPARKS; index += 1) {
      const angle = (index / SPARKS) * Math.PI * 2 + 0.3;
      const reach = inner + 0.1 + 0.07 * Math.sin(flicker + index * 2.1);
      const cx = Math.cos(angle);
      const sy = Math.sin(angle);
      const dx = u.x * cx + w.x * sy;
      const dy = u.y * cx + w.y * sy;
      const dz = u.z * cx + w.z * sy;
      attribute.setXYZ(index * 2, point.x + dx * inner, point.y + dy * inner, point.z + dz * inner);
      attribute.setXYZ(index * 2 + 1, point.x + dx * reach, point.y + dy * reach, point.z + dz * reach);
    }
    attribute.needsUpdate = true;
    geometry.computeBoundingSphere();
  });

  return <lineSegments ref={lines} geometry={geometry} material={material} raycast={() => null} />;
}
