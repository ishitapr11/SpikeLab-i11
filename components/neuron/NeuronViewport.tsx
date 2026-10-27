"use client";

import dynamic from "next/dynamic";
import { useState, useSyncExternalStore } from "react";
import type { NeuronSceneProps } from "@/components/neuron/scene-types";
import { NeuronPointerSurface } from "@/components/neuron/NeuronPointerSurface";
import { ScenePlaceholder, WebGLFallback } from "@/components/neuron/WebGLFallback";
import { WebGLBoundary } from "@/components/neuron/WebGLBoundary";

const NeuronScene = dynamic(
  () => import("@/components/neuron/NeuronScene").then((mod) => mod.NeuronScene),
  { ssr: false, loading: () => <ScenePlaceholder /> },
);

let webGLCache: "ok" | "no" | undefined;

function webGLSupport(): "ok" | "no" {
  if (webGLCache) return webGLCache;
  try {
    const canvas = document.createElement("canvas");
    webGLCache = canvas.getContext("webgl2") || canvas.getContext("webgl") ? "ok" : "no";
  } catch {
    webGLCache = "no";
  }
  return webGLCache;
}

function subscribeNoop() {
  return () => {};
}

function serverUnknown(): "unknown" {
  return "unknown";
}

export function NeuronViewport(props: NeuronSceneProps) {
  const support = useSyncExternalStore(subscribeNoop, webGLSupport, serverUnknown);
  const [failed, setFailed] = useState(false);

  let scene = <ScenePlaceholder />;
  if (support === "no" || failed) scene = <WebGLFallback />;
  else if (support === "ok") {
    scene = (
      <WebGLBoundary fallback={<WebGLFallback />}>
        <NeuronScene {...props} onFailure={() => setFailed(true)} />
      </WebGLBoundary>
    );
  }

  return <NeuronPointerSurface viewRef={props.viewRef}>{scene}</NeuronPointerSurface>;
}
