"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const STEPS = [
  {
    title: "Resting potential",
    body: "With no input, the membrane sits at Vrest, set by the ion gradients across it.",
  },
  {
    title: "Input integration",
    body: "Current pushes the voltage up. The time constant sets how fast; resistance × current sets how far.",
  },
  {
    title: "Threshold",
    body: "When the spike-initiation zone reaches threshold, this simplified model fires.",
  },
  {
    title: "Action potential",
    body: "A brief regenerative impulse runs down the axon, renewed at each node of Ranvier.",
  },
  {
    title: "Refractory period",
    body: "Just after a spike the model cannot fire again until the refractory interval ends.",
  },
];

const NUMERALS = ["i", "ii", "iii", "iv", "v"];

export function SignallingPanel({
  paused,
  onTogglePause,
  onReplay,
  active,
}: {
  paused: boolean;
  onTogglePause: () => void;
  onReplay: () => void;
  active: boolean;
}) {
  return (
    <div className="flex h-full flex-col justify-center">
      <div className={cn("lg:max-w-[500px]", active ? "pointer-events-auto" : "pointer-events-none")}>
        <p className="eyebrow">02 / Electrical signalling</p>
        <h2 className="mt-[1.4vh] font-display text-[clamp(2.2rem,5.8vh,3.2rem)] leading-[0.95]">
          From input <span className="italic">to impulse.</span>
        </h2>
        <ol className="mt-[2.4vh] space-y-[1.5vh]">
          {STEPS.map((step, index) => (
            <li key={step.title} className="grid grid-cols-[1.75rem_1fr] gap-x-2">
              <span className="font-display text-[19px] leading-tight italic text-graphite">
                {NUMERALS[index]}.
              </span>
              <p className="text-[14.5px] leading-snug text-ink-2">
                <span className="font-medium text-ink">{step.title}. </span>
                {step.body}
              </p>
            </li>
          ))}
        </ol>
        <div className="mt-[2.6vh] flex flex-wrap items-center gap-3">
          <Button variant="outline" size="small" onClick={onTogglePause} aria-pressed={paused}>
            {paused ? <Play size={13} strokeWidth={1.6} /> : <Pause size={13} strokeWidth={1.6} />}
            {paused ? "Resume impulse" : "Pause impulse"}
          </Button>
          <Button variant="outline" size="small" onClick={onReplay}>
            <RotateCcw size={13} strokeWidth={1.6} />
            Replay
          </Button>
          <p className="hand text-[18px] leading-tight text-graphite">a diagram of travel, not of charge</p>
        </div>
      </div>
    </div>
  );
}
