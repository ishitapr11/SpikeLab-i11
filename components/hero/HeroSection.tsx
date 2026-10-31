"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { HeroFigure } from "@/components/hero/HeroFigure";
import { buttonClass } from "@/components/ui/Button";

export function HeroSection({ onExplore, reduced }: { onExplore: () => void; reduced: boolean }) {
  const rise = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: [0.22, 0.8, 0.24, 1] as const },
        };

  return (
    <section className="relative flex min-h-[100svh] flex-col px-4 pt-20 pb-6 sm:px-6 lg:px-10">
      <div className="mx-auto grid w-full max-w-[1360px] flex-1 items-center gap-10 py-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div>
          <motion.h1
            className="mt-0 font-display text-[clamp(4.5rem,13vw,10.5rem)] leading-[0.82] tracking-[-0.035em]"
            {...rise(0.08)}
          >
            Spike<span className="italic">Lab</span>
          </motion.h1>
          <motion.div className="mt-5 flex items-center gap-4" {...rise(0.18)}>
            <span className="rule w-12 shrink-0" aria-hidden="true" />
            <p className="font-display text-[clamp(1.5rem,3vw,2.2rem)] italic leading-tight">
              Simulating Neuronal Firing
            </p>
          </motion.div>
          <motion.p className="mt-6 max-w-[34rem] text-[17px] leading-relaxed text-ink-2" {...rise(0.26)}>
            Explore how neurons receive electrical input, integrate signals, cross firing thresholds,
            and generate action potentials. Then change the properties of a model neuron and watch its
            electrical behaviour respond.
          </motion.p>
          <motion.div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4" {...rise(0.34)}>
            <button type="button" onClick={onExplore} className={buttonClass("solid")}>
              Explore the Neuron
            </button>
            <Link href="/simulator" className={buttonClass("text", "text-[16px]")}>
              or go straight to the lab →
            </Link>
          </motion.div>
        </div>
        <motion.div {...(reduced ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.6, delay: 0.2 } })}>
          <HeroFigure reduced={reduced} />
        </motion.div>
      </div>

      <motion.button
        type="button"
        onClick={onExplore}
        className="mx-auto mt-2 flex flex-col items-center text-ink-2 hover:text-ink"
        aria-label="Scroll to the neuron"
        {...(reduced ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 0.9, duration: 0.6 } })}
      >
        <span className="hand text-[22px]">scroll to meet the neuron</span>
        <svg width="26" height="40" viewBox="0 0 26 40" fill="none" aria-hidden="true" className="mt-1">
          <path
            d="M13 2 C 9 12, 17 18, 12 34"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            filter="url(#ink-wobble)"
          />
          <path d="M6 27 L12 35 L18 28" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.button>
    </section>
  );
}
