"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type * as THREE from "three";
import { NeuronCameraController } from "@/components/neuron/NeuronCameraController";
import { NeuronModel } from "@/components/neuron/NeuronModel";
import type { NeuronSceneProps } from "@/components/neuron/scene-types";

function ContextLossWatch({ onFailure }: { onFailure: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const onLost = (event: Event) => {
      event.preventDefault();
      onFailure();
    };
    canvas.addEventListener("webglcontextlost", onLost);
    return () => canvas.removeEventListener("webglcontextlost", onLost);
  }, [gl, onFailure]);
  return null;
}

export function NeuronScene({
  progressRef,
  viewRef,
  reduced,
  compact,
  selected,
  onSelect,
  phase,
  signalRunId,
  signalPaused,
  quality,
  onFailure,
}: NeuronSceneProps & { onFailure: () => void }) {
  const groupRef = useRef<THREE.Group>(null);

  return (
    <Canvas
      flat
      linear
      dpr={quality === "high" ? [1, 2] : [1, 1.5]}
      camera={{ position: [0, 0, 16], fov: 32, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true, powerPreference: "default" }}
      onPointerMissed={() => onSelect(null)}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      aria-label="Interactive ink drawing of a neuron"
    >
      <ContextLossWatch onFailure={onFailure} />
      {/* Registered first so the camera and orientation are settled before anything reads them. */}
      <NeuronCameraController
        groupRef={groupRef}
        progressRef={progressRef}
        viewRef={viewRef}
        reduced={reduced}
        compact={compact}
      />
      <NeuronModel
        groupRef={groupRef}
        selected={selected}
        onSelect={onSelect}
        quality={quality}
        phase={phase}
        signalRunId={signalRunId}
        signalPaused={signalPaused}
        reduced={reduced}
      />
    </Canvas>
  );
}
