"use client";

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { AnatomyId } from "@/lib/anatomy";
import { getNeuronAssets } from "@/lib/neuron-geometry";
import { ElectricalSignal } from "@/components/neuron/ElectricalSignal";
import { NeuronLabels } from "@/components/neuron/NeuronLabels";
import { applyEmphasis, createInkMaterials, PART_IDS, type PartId } from "@/components/neuron/ink-materials";
import type { GroupRef, NeuronSceneProps } from "@/components/neuron/scene-types";

const noRaycast = () => null;

export function NeuronModel({
  groupRef,
  selected,
  onSelect,
  quality,
  phase,
  signalRunId,
  signalPaused,
  reduced,
}: Pick<
  NeuronSceneProps,
  "selected" | "onSelect" | "quality" | "phase" | "signalRunId" | "signalPaused" | "reduced"
> & { groupRef: GroupRef }) {
  const assets = useMemo(() => getNeuronAssets(quality), [quality]);
  const materials = useMemo(() => createInkMaterials(assets.nucleus), [assets]);
  const pixelRatio = useRef(1);
  const inverse = useRef(new THREE.Matrix4());
  const resolution = useRef(new THREE.Vector2());

  useEffect(() => () => materials.dispose(), [materials]);

  useEffect(() => {
    applyEmphasis(materials, selected, pixelRatio.current);
  }, [materials, selected]);

  useFrame(({ camera, gl }) => {
    const group = groupRef.current;
    if (!group) return;
    gl.getDrawingBufferSize(resolution.current);
    materials.shared.uResolution.value.copy(resolution.current);
    const ratio = gl.getPixelRatio();
    if (ratio !== pixelRatio.current) {
      pixelRatio.current = ratio;
      applyEmphasis(materials, selected, ratio);
    }
    // The soma shader draws the nucleus by casting the view ray in the cell's own coordinates.
    inverse.current.copy(group.matrixWorld).invert();
    (materials.parts.soma.surface.uniforms.uCamLocal.value as THREE.Vector3)
      .copy(camera.position)
      .applyMatrix4(inverse.current);
  });

  const choose = (id: AnatomyId) => (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (id === "soma" && event.intersections.some((hit) => hit.object.userData.part === "nucleus")) {
      onSelect(selected === "nucleus" ? null : "nucleus");
      return;
    }
    onSelect(selected === id ? null : id);
  };

  const geometry: Record<PartId, THREE.BufferGeometry> = {
    soma: assets.soma,
    dendrites: assets.dendrites,
    axon: assets.axon,
    myelin: assets.myelin,
    nodes: assets.nodes,
    terminals: assets.terminals,
  };

  return (
    <group ref={groupRef}>
      {PART_IDS.map((id) => (
        <group key={id}>
          <mesh geometry={geometry[id]} material={materials.parts[id].surface} onClick={choose(id)} />
          <mesh geometry={geometry[id]} material={materials.parts[id].outline} raycast={noRaycast} />
        </group>
      ))}
      <mesh geometry={assets.nucleusHit} userData={{ part: "nucleus" }} onClick={choose("nucleus")}>
        <meshBasicMaterial visible={false} />
      </mesh>
      <NeuronLabels selected={selected} onSelect={onSelect} phase={phase} anchors={assets.anchors} />
      {phase === "signalling" && signalRunId > 0 ? (
        <ElectricalSignal
          assets={assets}
          shared={materials.shared}
          runId={signalRunId}
          paused={signalPaused}
          reduced={reduced}
        />
      ) : null}
    </group>
  );
}
