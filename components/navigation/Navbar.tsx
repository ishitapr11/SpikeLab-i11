"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonClass } from "@/components/ui/Button";
import { Wordmark } from "@/components/navigation/Wordmark";
import { cn } from "@/lib/cn";
import type { StoryPhase } from "@/lib/camera-poses";

const LINKS: Array<{ id: StoryPhase; label: string }> = [
  { id: "anatomy", label: "Anatomy" },
  { id: "signalling", label: "How it works" },
  { id: "parameters", label: "Parameters" },
];

export function Navbar({
  phase,
  onNavigate,
}: {
  phase: "hero" | StoryPhase;
  onNavigate: (phase: StoryPhase) => void;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled ? "bg-paper/92" : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <Wordmark />
        <nav className="flex items-center gap-1 sm:gap-6" aria-label="Primary">
          {LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              className="ink-link hidden text-[15px] md:inline-flex"
              aria-current={phase === link.id ? "true" : undefined}
              onClick={() => onNavigate(link.id)}
            >
              {link.label}
            </button>
          ))}
          <details className="relative md:hidden">
            <summary className="hand cursor-pointer list-none px-3 py-1 text-[21px] [&::-webkit-details-marker]:hidden">
              menu
            </summary>
            <div className="sketch absolute right-0 mt-2 w-48 bg-paper p-2">
              {LINKS.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  className="block w-full px-3 py-2 text-left text-[15px] hover:underline"
                  onClick={(event) => {
                    onNavigate(link.id);
                    const details = event.currentTarget.closest("details");
                    if (details) details.open = false;
                  }}
                >
                  {link.label}
                </button>
              ))}
            </div>
          </details>
          <Link href="/simulator" className={buttonClass("solid", undefined, "small")}>
            Enter Simulation
          </Link>
        </nav>
      </div>
      <div
        className={cn("rule-faint mx-auto max-w-[1360px] transition-opacity duration-300", scrolled ? "opacity-100" : "opacity-0")}
        aria-hidden="true"
      />
    </header>
  );
}
