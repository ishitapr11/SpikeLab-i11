import Link from "next/link";
import { PARAMETER_SPECS, type ParameterSpec } from "@/lib/parameter-specs";
import { buttonClass } from "@/components/ui/Button";
import { ParameterSymbol } from "@/components/ui/ParameterSymbol";
import { cn } from "@/lib/cn";

function ParameterNote({ spec }: { spec: ParameterSpec }) {
  return (
    <article className="sketch bg-paper/92 px-3.5 py-[1.1vh] lg:px-4">
      <div className="flex items-start gap-3">
        <ParameterSymbol symbol={spec.symbol} className="w-11 shrink-0 font-display text-[26px] leading-none" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2">
            <h3 className="text-[15px] font-medium">{spec.label}</h3>
            <span className="font-mono text-[11px] text-graphite">{spec.unit}</span>
          </div>
          <p className="mt-0.5 text-[13.5px] leading-snug text-ink-2">{spec.explanation}</p>
        </div>
      </div>
    </article>
  );
}

/** Three columns on desktop with the upright neuron in the middle; one flowing column on mobile. */
export function ParameterOverview({ active = true }: { active?: boolean }) {
  const input = PARAMETER_SPECS.filter((spec) => spec.group === "input");
  const membrane = PARAMETER_SPECS.filter((spec) => spec.group === "membrane");
  const interactive = active ? "pointer-events-auto" : "pointer-events-none";

  return (
    <div className="flex h-full flex-col gap-[2vh] lg:px-10 lg:pt-[3vh] lg:pb-[3vh]">
      <div className={cn("lg:min-h-0 lg:flex-1", interactive)}>
        <div className="lg:grid lg:h-full lg:grid-cols-[minmax(250px,330px)_1fr_minmax(250px,330px)] lg:items-center lg:gap-8">
          <div>
            <p className="eyebrow">03 / Parameters</p>
            <h2 className="mt-[1.2vh] font-display text-[clamp(2.1rem,5.2vh,2.9rem)] leading-[0.95]">
              The controls <span className="italic">you will use.</span>
            </h2>
            <p className="mt-[1.4vh] text-[14.5px] leading-snug text-ink-2">
              Seven numbers describe the model neuron. These notes name them; the sliders are in the lab.
            </p>
            <p className="eyebrow mt-[2.2vh]">Input &amp; threshold</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {input.map((spec) => (
                <ParameterNote key={spec.key} spec={spec} />
              ))}
            </div>
          </div>
          <div className="hidden lg:block" aria-hidden="true" />
          <div className="mt-5 lg:mt-0">
            <p className="eyebrow">Membrane &amp; timing</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {membrane.map((spec) => (
                <ParameterNote key={spec.key} spec={spec} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className={cn("flex flex-col items-center gap-1.5", interactive)}>
        <Link href="/simulator" className={buttonClass("solid", "px-7 py-3.5 text-[17px]")}>
          Enter Simulation →
        </Link>
        <p className="hand text-[18px] text-graphite">the lab runs entirely in your browser</p>
      </div>
    </div>
  );
}
