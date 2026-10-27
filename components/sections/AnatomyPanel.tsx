"use client";

import { ANATOMY, ANATOMY_IDS, type AnatomyId } from "@/lib/anatomy";
import { cn } from "@/lib/cn";

const FACTS = [
  "Dendrites gather input; one neuron can carry thousands of synapses.",
  "Most spikes begin at the axon initial segment, just beyond the soma.",
  "Myelin and the nodes of Ranvier set how fast the spike reaches the terminals.",
];

const LETTERS = "abcdefg";

/**
 * Sized to fit one screen beside the drawing: type and spacing scale with viewport height, and
 * choosing a structure swaps its description into the facts slot instead of growing the panel.
 */
export function AnatomyPanel({
  selected,
  onSelect,
  active,
}: {
  selected: AnatomyId | null;
  onSelect: (id: AnatomyId | null) => void;
  active: boolean;
}) {
  return (
    <div className="flex h-full flex-col justify-center">
      <div className={cn("lg:max-w-[440px]", active ? "pointer-events-auto" : "pointer-events-none")}>
        <p className="eyebrow">01 / Anatomy</p>
        <h2 className="mt-[1.4vh] font-display text-[clamp(2.3rem,6.2vh,3.4rem)] leading-[0.95]">
          Meet the <span className="italic">neuron.</span>
        </h2>
        <p className="mt-[1.8vh] text-[15.5px] leading-relaxed text-ink-2">
          Neurons receive, integrate and pass on electrical and chemical signals. Their branching
          form lets one cell gather input from many others and send a single result onward.
        </p>

        <div className="mt-[2.2vh] min-h-[7.6rem]" aria-live="polite">
          {selected ? (
            <div>
              <p className="font-display text-[22px] leading-none italic">{ANATOMY[selected].label}</p>
              <p className="mt-2 text-[15px] leading-relaxed">{ANATOMY[selected].summary}</p>
            </div>
          ) : (
            <ul className="space-y-1.5 text-[14.5px] leading-snug">
              {FACTS.map((fact) => (
                <li key={fact} className="flex gap-3">
                  <span className="hand mt-[-3px] text-[20px] leading-none" aria-hidden="true">
                    ~
                  </span>
                  <span>{fact}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-[1.6vh]">
          <div className="flex items-baseline justify-between gap-3">
            <p className="eyebrow">Key to the figure</p>
            <p className="hand text-[18px] text-graphite">tap a name, or the drawing</p>
          </div>
          <div className="rule-faint mt-1.5" aria-hidden="true" />
          <div className="mt-1 grid grid-cols-2 gap-x-4" role="radiogroup" aria-label="Anatomical structures">
            {ANATOMY_IDS.map((id, index) => {
              const isOn = selected === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={isOn}
                  className={cn(
                    "flex items-baseline gap-2 py-[0.55vh] text-left text-[15px]",
                    isOn ? "font-medium" : "text-ink-2 hover:text-ink",
                  )}
                  onClick={() => onSelect(isOn ? null : id)}
                >
                  <span className="w-3 font-display italic text-graphite">{LETTERS[index]}.</span>
                  <span className={cn(isOn && "ink-link ink-link-static")}>{ANATOMY[id].label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
