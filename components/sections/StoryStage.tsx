"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { AnatomyId } from "@/lib/anatomy";
import { phaseFromProgress, type StoryPhase } from "@/lib/camera-poses";
import { AnatomyPanel } from "@/components/sections/AnatomyPanel";
import { ParameterOverview } from "@/components/sections/ParameterOverview";
import { SignallingPanel } from "@/components/sections/SignallingPanel";
import { NeuronHud } from "@/components/neuron/NeuronHud";
import { NeuronViewport } from "@/components/neuron/NeuronViewport";
import type { NeuronViewState } from "@/components/neuron/scene-types";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const FIGURE_CAPTION: Record<StoryPhase, string> = {
  anatomy: "Fig. 2. A neuron, drawn from a procedural model. Not to scale.",
  signalling: "Fig. 3. Soma, axon hillock and first internodes. The black band marks where the impulse is.",
  parameters: "Fig. 4. The same cell, turned upright.",
};

/** Share of the mobile viewport given to the pinned drawing; the text scrolls beneath it. */
const COMPACT_STAGE = 0.5;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function storyBlockId(phase: StoryPhase): string {
  return `story-${phase}`;
}

/**
 * Desktop: one pinned screen; scroll progress drives the camera and cross-fades three panels that
 * each fit the viewport. Mobile: the drawing is pinned to the top half and the three texts scroll
 * past underneath in normal page flow, so nothing ever needs its own scrollbar.
 */
export function StoryStage({
  stageRef,
  reduced,
  onPhaseChange,
}: {
  stageRef: RefObject<HTMLElement | null>;
  reduced: boolean;
  onPhaseChange: (phase: "hero" | StoryPhase) => void;
}) {
  const progressRef = useRef(0);
  const viewRef = useRef<NeuronViewState>({ rotX: 0, rotY: 0, zoom: 1 });
  const [phase, setPhase] = useState<StoryPhase>("anatomy");
  const [selected, setSelected] = useState<AnatomyId | null>(null);
  const [signalRunId, setSignalRunId] = useState(0);
  const [signalPaused, setSignalPaused] = useState(false);
  const compact = useMediaQuery("(max-width: 1023px)");
  const compactRef = useRef(compact);
  const { scrollYProgress } = useScroll({
    target: stageRef,
    offset: ["start start", "end end"],
  });

  const anatomyOpacity = useTransform(scrollYProgress, [0, 0.21, 0.3], [1, 1, 0]);
  const signalOpacity = useTransform(scrollYProgress, [0.25, 0.35, 0.56, 0.67], [0, 1, 1, 0]);
  const parameterOpacity = useTransform(scrollYProgress, [0.61, 0.74, 1], [0, 1, 1]);

  useEffect(() => {
    compactRef.current = compact;
  }, [compact]);

  useEffect(() => {
    let frame = 0;
    let reported: "hero" | StoryPhase | null = null;
    const measure = () => {
      const element = stageRef.current;
      if (element) {
        const rect = element.getBoundingClientRect();
        let next: "hero" | StoryPhase;
        if (compactRef.current) {
          // How far each later text block has risen from the bottom edge to the drawing's edge.
          const bottom = window.innerHeight;
          const edge = bottom * COMPACT_STAGE;
          const rise = (phaseId: StoryPhase) => {
            const block = document.getElementById(storyBlockId(phaseId));
            return block ? clamp01((bottom - block.getBoundingClientRect().top) / (bottom - edge)) : 0;
          };
          const signal = rise("signalling");
          const parameters = rise("parameters");
          progressRef.current = parameters > 0 ? 0.54 + 0.26 * parameters : 0.19 + 0.21 * signal;
          next = parameters >= 0.6 ? "parameters" : signal >= 0.6 ? "signalling" : "anatomy";
          if (rect.top > 48) next = "hero";
        } else {
          const distance = Math.max(element.offsetHeight - window.innerHeight, 1);
          const scrolled = Math.min(Math.max(-rect.top, 0), distance);
          progressRef.current = scrolled / distance;
          next = rect.top > 48 ? "hero" : phaseFromProgress(progressRef.current);
        }
        if (next !== reported) {
          reported = next;
          if (next !== "hero") setPhase(next);
          onPhaseChange(next);
        }
      }
      frame = window.requestAnimationFrame(measure);
    };
    frame = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(frame);
  }, [onPhaseChange, stageRef]);

  const previousPhase = useRef<StoryPhase>("anatomy");
  useEffect(() => {
    if (phase === "signalling" && previousPhase.current !== "signalling" && !reduced) {
      setSignalRunId((id) => id + 1);
      setSignalPaused(false);
    }
    previousPhase.current = phase;
  }, [phase, reduced]);

  const replay = () => {
    setSignalPaused(false);
    setSignalRunId((id) => id + 1);
  };

  const viewport = (
    <div className="relative h-full">
      <NeuronViewport
        progressRef={progressRef}
        viewRef={viewRef}
        reduced={reduced}
        selected={selected}
        onSelect={setSelected}
        phase={phase}
        signalRunId={signalRunId}
        signalPaused={signalPaused}
        compact={compact}
        quality={compact ? "low" : "high"}
      />
      {compact || phase !== "parameters" ? (
        <div className={compact || phase === "anatomy" ? "" : "lg:[&>div]:items-end lg:[&>div]:pl-[54%]"}>
          <NeuronHud
            viewRef={viewRef}
            selected={selected}
            onSelect={setSelected}
            figure={FIGURE_CAPTION[phase]}
            compact={compact}
          />
        </div>
      ) : null}
    </div>
  );

  const signalling = (
    <SignallingPanel
      paused={signalPaused}
      onTogglePause={() => setSignalPaused((value) => !value)}
      onReplay={replay}
      active={compact || phase === "signalling"}
    />
  );

  if (compact) {
    return (
      <section ref={stageRef} id="anatomy" className="relative">
        <div className="sticky top-0 z-10 h-[50svh] bg-paper pt-16">
          {viewport}
          <div className="rule-faint absolute inset-x-4 bottom-0" aria-hidden="true" />
        </div>
        <div className="px-4 sm:px-6">
          <div id={storyBlockId("anatomy")} className="flex min-h-[50svh] flex-col justify-center py-10">
            <AnatomyPanel selected={selected} onSelect={setSelected} active />
          </div>
          <div id={storyBlockId("signalling")} className="flex min-h-[50svh] flex-col justify-center py-10">
            {signalling}
          </div>
          <div id={storyBlockId("parameters")} className="flex min-h-[50svh] flex-col justify-center py-10">
            <ParameterOverview />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={stageRef} id="anatomy" className="relative h-[520vh]">
      <div id="signalling" className="pointer-events-none absolute top-[38%] h-px w-px" />
      <div id="parameters" className="pointer-events-none absolute top-[73%] h-px w-px" />
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div className="absolute inset-0">{viewport}</div>
        <div className="absolute inset-x-0 top-16 bottom-0">
          <motion.div
            style={{ opacity: reduced ? (phase === "anatomy" ? 1 : 0) : anatomyOpacity }}
            className="pointer-events-none absolute inset-0 flex justify-end bg-[linear-gradient(270deg,var(--color-paper)_36%,transparent_56%)] pr-10 pl-[58%]"
          >
            <AnatomyPanel selected={selected} onSelect={setSelected} active={phase === "anatomy"} />
          </motion.div>
          <motion.div
            style={{ opacity: reduced ? (phase === "signalling" ? 1 : 0) : signalOpacity }}
            className="pointer-events-none absolute inset-0 flex justify-start bg-[linear-gradient(90deg,var(--color-paper)_34%,transparent_54%)] pr-[58%] pl-10"
          >
            {signalling}
          </motion.div>
          <motion.div
            style={{ opacity: reduced ? (phase === "parameters" ? 1 : 0) : parameterOpacity }}
            className="pointer-events-none absolute inset-0"
          >
            <ParameterOverview active={phase === "parameters"} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
