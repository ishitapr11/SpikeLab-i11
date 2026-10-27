"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PHASE_SCROLL, type StoryPhase } from "@/lib/camera-poses";
import { Footer } from "@/components/navigation/Footer";
import { Navbar } from "@/components/navigation/Navbar";
import { HeroSection } from "@/components/hero/HeroSection";
import { StoryStage, storyBlockId } from "@/components/sections/StoryStage";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function HomeExperience() {
  const stageRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<"hero" | StoryPhase>("hero");

  const scrollToPhase = useCallback(
    (next: StoryPhase) => {
      const element = stageRef.current;
      if (!element) return;
      const behavior = reduced ? "auto" : "smooth";
      const block = document.getElementById(storyBlockId(next));
      if (block && window.matchMedia("(max-width: 1023px)").matches) {
        // Mobile: bring the text block up to the bottom edge of the pinned drawing.
        const stageTop = window.scrollY + element.getBoundingClientRect().top;
        const blockTop = window.scrollY + block.getBoundingClientRect().top;
        const target = next === "anatomy" ? stageTop : blockTop - window.innerHeight * 0.5;
        window.scrollTo({ top: target, behavior });
      } else {
        const top = window.scrollY + element.getBoundingClientRect().top;
        const distance = Math.max(element.offsetHeight - window.innerHeight, 0);
        window.scrollTo({ top: top + distance * PHASE_SCROLL[next], behavior });
      }
      const hash = `#${next}`;
      if (window.location.hash !== hash) window.history.replaceState(null, "", hash);
    },
    [reduced],
  );

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash === "anatomy" || hash === "signalling" || hash === "parameters") {
      const timer = window.setTimeout(() => scrollToPhase(hash), 80);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [scrollToPhase]);

  return (
    <>
      <a
        href="#anatomy"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
        onClick={(event) => {
          event.preventDefault();
          scrollToPhase("anatomy");
        }}
      >
        Skip to the neuron
      </a>
      <Navbar phase={phase} onNavigate={scrollToPhase} />
      <main>
        <HeroSection onExplore={() => scrollToPhase("anatomy")} reduced={reduced} />
        <StoryStage stageRef={stageRef} reduced={reduced} onPhaseChange={setPhase} />
      </main>
      <Footer />
    </>
  );
}
