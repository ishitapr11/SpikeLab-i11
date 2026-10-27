"use client";

import { useEffect, useRef } from "react";
import { clampZoom, type NeuronViewState } from "@/components/neuron/scene-types";

function isInterfaceControl(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("button, a, input, select, textarea, label, summary"));
}

export function NeuronPointerSurface({
  viewRef,
  children,
}: {
  viewRef: React.RefObject<NeuronViewState>;
  children: React.ReactNode;
}) {
  const surfaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = surfaceRef.current;
    if (!element) return;

    let dragging = false;
    let mode: "undecided" | "rotate" | "scroll" = "undecided";
    let lastX = 0;
    let lastY = 0;
    let pinchDistance: number | null = null;

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || isInterfaceControl(event.target)) return;
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      mode = event.pointerType === "touch" ? "undecided" : "rotate";
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      if (mode === "undecided") {
        if (Math.hypot(dx, dy) < 8) return;
        mode = Math.abs(dx) > Math.abs(dy) ? "rotate" : "scroll";
      }
      if (mode !== "rotate") return;
      lastX = event.clientX;
      lastY = event.clientY;
      viewRef.current.rotY += dx * 0.0055;
      viewRef.current.rotX = Math.min(0.9, Math.max(-0.9, viewRef.current.rotX + dy * 0.004));
    };

    const onPointerUp = () => {
      dragging = false;
      mode = "undecided";
    };

    const onWheel = (event: WheelEvent) => {
      if (!event.altKey && !event.metaKey) return;
      event.preventDefault();
      const factor = event.deltaY > 0 ? 1.06 : 0.94;
      viewRef.current.zoom = clampZoom(viewRef.current.zoom * factor);
    };

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2) {
        pinchDistance = null;
        return;
      }
      event.preventDefault();
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      const distance = Math.hypot(dx, dy);
      if (pinchDistance !== null && pinchDistance > 0) {
        viewRef.current.zoom = clampZoom(viewRef.current.zoom * (pinchDistance / distance));
      }
      pinchDistance = distance;
    };

    const onTouchEnd = () => {
      pinchDistance = null;
    };

    element.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    element.addEventListener("wheel", onWheel, { passive: false });
    element.addEventListener("touchmove", onTouchMove, { passive: false });
    element.addEventListener("touchend", onTouchEnd);

    return () => {
      element.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      element.removeEventListener("wheel", onWheel);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", onTouchEnd);
    };
  }, [viewRef]);

  return (
    <div ref={surfaceRef} className="neuron-stage relative h-full">
      {children}
    </div>
  );
}
