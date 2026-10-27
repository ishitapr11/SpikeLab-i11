"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { fitDistance, samplePose } from "@/lib/camera-poses";
import { clampZoom, type GroupRef, type NeuronSceneProps } from "@/components/neuron/scene-types";

/**
 * The only writer of the camera and of the neuron's orientation. Scroll progress picks a pose,
 * the user's drag adds a turntable rotation, and the pose's screen frame is applied as an
 * off-axis projection so the neuron can sit left, right or centre without changing perspective.
 */
export function NeuronCameraController({
  groupRef,
  progressRef,
  viewRef,
  reduced,
  compact,
}: Pick<NeuronSceneProps, "progressRef" | "viewRef" | "reduced" | "compact"> & { groupRef: GroupRef }) {
  const focus = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());

  useFrame(({ camera, size }) => {
    const group = groupRef.current;
    if (!group || !(camera instanceof THREE.PerspectiveCamera)) return;
    const pose = samplePose(progressRef.current, reduced, compact);
    const view = viewRef.current;

    group.rotation.set(view.rotX, view.rotY, pose.rotZ, "XYZ");
    group.updateMatrixWorld(true);
    focus.current.set(pose.focus[0], pose.focus[1], pose.focus[2]).applyMatrix4(group.matrixWorld);

    const aspect = size.width / Math.max(size.height, 1);
    const distance = fitDistance(pose, camera.fov, aspect) * clampZoom(view.zoom);
    direction.current.set(
      Math.sin(pose.azimuth) * Math.cos(pose.elevation),
      Math.sin(pose.elevation),
      Math.cos(pose.azimuth) * Math.cos(pose.elevation),
    );
    camera.position.copy(focus.current).addScaledVector(direction.current, distance);
    camera.lookAt(focus.current);
    camera.near = Math.max(0.05, distance * 0.05);
    camera.far = distance * 6;

    camera.updateProjectionMatrix();
    camera.projectionMatrix.elements[8] = -pose.frameX;
    camera.projectionMatrix.elements[9] = -pose.frameY;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  });

  return null;
}
