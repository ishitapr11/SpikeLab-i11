"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { ANATOMY, ANATOMY_IDS, type AnatomyId } from "@/lib/anatomy";
import type { StoryPhase } from "@/lib/camera-poses";
import type { Vec3 } from "@/lib/neuron-geometry";

const PHASE_LABELS: Record<StoryPhase, readonly AnatomyId[]> = {
  anatomy: ANATOMY_IDS,
  signalling: ["soma", "axon", "myelin", "nodes"],
  parameters: [],
};

/** Where each handwritten label sits relative to its anchor, in CSS pixels at full size. */
const LEADER: Record<AnatomyId, [number, number]> = {
  soma: [34, -96],
  nucleus: [-104, 58],
  dendrites: [-64, -46],
  axon: [26, -78],
  myelin: [36, -70],
  nodes: [30, 66],
  terminals: [-18, 64],
};

const SVG_NS = "http://www.w3.org/2000/svg";
const world = new THREE.Vector3();
const toPoint = new THREE.Vector3();
const forward = new THREE.Vector3();

interface LabelNodes {
  root: HTMLDivElement;
  path: SVGPathElement;
  button: HTMLButtonElement;
}

/**
 * Handwritten labels with inked leader lines, positioned as DOM so they stay crisp and focusable.
 * They are created once and moved every frame without React re-rendering.
 */
export function NeuronLabels({
  selected,
  onSelect,
  phase,
  anchors,
}: {
  selected: AnatomyId | null;
  onSelect: (id: AnatomyId | null) => void;
  phase: StoryPhase;
  anchors: Record<AnatomyId, Vec3>;
}) {
  const { gl } = useThree();
  const nodes = useRef<Partial<Record<AnatomyId, LabelNodes>>>({});
  const selectedRef = useRef(selected);
  const onSelectRef = useRef(onSelect);
  const phaseRef = useRef(phase);
  const group = useRef<THREE.Group>(null);

  useEffect(() => {
    selectedRef.current = selected;
    onSelectRef.current = onSelect;
    phaseRef.current = phase;
  }, [onSelect, phase, selected]);

  useEffect(() => {
    const host = gl.domElement.parentElement;
    if (!host) return;
    const created: HTMLDivElement[] = [];
    for (const id of ANATOMY_IDS) {
      const root = document.createElement("div");
      root.className = "neuron-label";
      root.style.display = "none";
      const svg = document.createElementNS(SVG_NS, "svg");
      svg.setAttribute("width", "1");
      svg.setAttribute("height", "1");
      svg.setAttribute("aria-hidden", "true");
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", "1.1");
      path.setAttribute("stroke-linecap", "round");
      const dot = document.createElementNS(SVG_NS, "circle");
      dot.setAttribute("r", "2.6");
      dot.setAttribute("fill", "currentColor");
      dot.setAttribute("stroke", "var(--color-paper)");
      dot.setAttribute("stroke-width", "1.4");
      svg.append(path, dot);
      svg.style.color = "var(--color-ink)";
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = ANATOMY[id].label;
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelectRef.current(selectedRef.current === id ? null : id);
      });
      root.append(svg, button);
      host.appendChild(root);
      nodes.current[id] = { root, path, button };
      created.push(root);
    }
    return () => {
      created.forEach((element) => element.remove());
      nodes.current = {};
    };
  }, [gl]);

  useEffect(() => {
    for (const id of ANATOMY_IDS) {
      nodes.current[id]?.button.setAttribute("aria-pressed", String(selected === id));
    }
  }, [selected, gl]);

  useFrame(({ camera, size }) => {
    const node = group.current;
    if (!node) return;
    node.updateWorldMatrix(true, false);
    const visible = new Set<AnatomyId>(PHASE_LABELS[phaseRef.current]);
    if (selectedRef.current) visible.add(selectedRef.current);
    camera.getWorldDirection(forward);
    const scale = Math.min(1, Math.max(0.55, size.width / 900));

    for (const id of ANATOMY_IDS) {
      const label = nodes.current[id];
      if (!label) continue;
      const anchor = anchors[id];
      world.set(anchor[0], anchor[1], anchor[2]).applyMatrix4(node.matrixWorld);
      toPoint.copy(world).sub(camera.position);
      const behind = toPoint.dot(forward) <= 0;
      world.project(camera);
      const x = (world.x * 0.5 + 0.5) * size.width;
      const y = (-world.y * 0.5 + 0.5) * size.height;
      const [lx, ly] = LEADER[id];
      const dx = lx * scale;
      const dy = ly * scale;
      const onScreen = world.z < 1 && x > 8 && x < size.width - 8 && y > 8 && y < size.height - 8;
      const show = visible.has(id) && !behind && onScreen;
      label.root.style.display = show ? "block" : "none";
      if (!show) continue;
      label.root.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      const bend = dx > 0 ? -6 : 6;
      label.path.setAttribute("d", `M0 0 Q ${(dx * 0.55 + bend).toFixed(1)} ${(dy * 0.45).toFixed(1)} ${dx.toFixed(1)} ${dy.toFixed(1)}`);
      label.button.style.left = `${dx}px`;
      label.button.style.top = `${dy}px`;
      label.button.style.fontSize = `${Math.round(21 * Math.max(0.82, scale))}px`;
      label.button.style.transform = dx < 0 ? "translate(-100%, -55%)" : "translate(0, -55%)";
    }
  });

  return <group ref={group} />;
}
