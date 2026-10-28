"use client";

import Link from "next/link";
import { useState } from "react";
import { DEFAULT_PARAMETERS } from "@/lib/parameter-specs";
import type { NeuronParameters, ParameterKey } from "@/lib/simulation-types";
import { useNeuronSimulation } from "@/hooks/useNeuronSimulation";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { FiringRateChart } from "@/components/simulator/FiringRateChart";
import { MetricCard } from "@/components/simulator/MetricCard";
import { ModelExplanation } from "@/components/simulator/ModelExplanation";
import { ParameterControls } from "@/components/simulator/ParameterControls";
import { VoltageChart } from "@/components/simulator/VoltageChart";
import { Wordmark } from "@/components/navigation/Wordmark";
import { Footer } from "@/components/navigation/Footer";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export function SimulatorDashboard() {
  const [parameters, setParameters] = useState<NeuronParameters>(DEFAULT_PARAMETERS);
  const { validation, result, curve, insights, curvePending } = useNeuronSimulation(parameters);
  const reduced = useReducedMotion();

  const update = (key: ParameterKey, value: number) => {
    setParameters((current) => ({ ...current, [key]: value }));
  };
  const resetAll = () => setParameters(DEFAULT_PARAMETERS);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-paper/95">
        <div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <Wordmark />
            <span className="hidden text-faint sm:inline" aria-hidden="true">
              /
            </span>
            <p className="hand hidden text-[21px] sm:block">simulation lab</p>
          </div>
          <nav className="flex items-center gap-3 sm:gap-6" aria-label="Lab">
            <a href="#how-it-works" className="ink-link hidden text-[15px] md:inline">
              How this model works
            </a>
            <Link href="/" className="ink-link text-[15px]">
              ← Back to SpikeLab
            </Link>
            <Button variant="outline" size="small" onClick={resetAll}>
              Reset all
            </Button>
          </nav>
        </div>
        <div className="rule-faint mx-auto max-w-[1360px]" aria-hidden="true" />
      </header>

      <main className="mx-auto max-w-[1360px] px-4 pt-8 pb-16 sm:px-6 lg:px-10">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="eyebrow">Plate II &nbsp;·&nbsp; Leaky integrate-and-fire</p>
            <h1 className="mt-3 font-display text-[clamp(2.8rem,6vw,4.6rem)] leading-[0.9]">
              The simulation <span className="italic">lab.</span>
            </h1>
          </div>
        </div>

        <div className="rule mt-6" aria-hidden="true" />
        {result ? (
          <div className="grid sm:grid-cols-2 sm:divide-x sm:divide-rule xl:grid-cols-4" aria-live="polite">
            <MetricCard
              label="Spike count"
              value={String(result.spikeCount)}
              detail={
                result.timeToFirstSpike === null
                  ? "No threshold crossing in this window."
                  : `First spike at ${result.timeToFirstSpike.toFixed(1)} ms.`
              }
            />
            <MetricCard
              label="Firing rate"
              value={result.firingRate.toFixed(1)}
              unit="spikes/s"
              detail={
                result.meanInterspikeInterval === null
                  ? `Spike count over the full ${result.config.simulationDuration.toFixed(0)} ms.`
                  : `Mean interval ${result.meanInterspikeInterval.toFixed(1)} ms. Rate uses the full window.`
              }
            />
            <MetricCard
              label="Minimum current to fire"
              value={result.minimumCurrentToFire === null ? "—" : result.minimumCurrentToFire.toFixed(2)}
              unit={result.minimumCurrentToFire === null ? undefined : "nA"}
              detail={
                result.minimumCurrentToFire === null
                  ? "No current from 0 to 10 nA spikes within this duration."
                  : `Smallest current in 0–10 nA with a spike in this window. Steady-state rheobase: ${result.steadyStateRheobase.toFixed(2)} nA.`
              }
            />
            <MetricCard
              label="Steady-state voltage"
              value={result.steadyStateVoltage.toFixed(1)}
              unit="mV"
              detail="Vrest + Rm I. Reached only while the membrane stays below threshold."
            />
          </div>
        ) : (
          <p className="py-5 text-[15px]" role="alert">
            <span className="mr-2 font-display text-[20px] italic">Note.</span>
            The current parameters cannot be simulated. Adjust the values marked below.
          </p>
        )}
        <div className="rule" aria-hidden="true" />

        {validation.issues.length > 0 ? (
          <ul className="mt-4 space-y-2" aria-label="Parameter warnings">
            {validation.issues.map((issue) => (
              <li
                key={`${issue.field}-${issue.message}`}
                className={cn(
                  "flex gap-3 text-[14px] leading-snug",
                  issue.severity === "error" ? "text-ink" : "text-ink-2",
                )}
              >
                <span className="font-display text-[18px] leading-none italic" aria-hidden="true">
                  {issue.severity === "error" ? "!" : "~"}
                </span>
                <span>
                  <span className="sr-only">{issue.severity === "error" ? "Error: " : "Note: "}</span>
                  {issue.message}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-10 grid items-start gap-12 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-14">
          <div className="lg:sticky lg:top-24 lg:max-h-[calc(100svh-7rem)] lg:overflow-y-auto lg:pr-3">
            <ParameterControls
              parameters={parameters}
              onChange={update}
              onReplace={setParameters}
              onRestore={resetAll}
            />
          </div>
          <div className="min-w-0 space-y-12">
            {result ? (
              <>
                <VoltageChart result={result} reduced={reduced} />
                <FiringRateChart
                  curve={curve}
                  inputCurrent={parameters.inputCurrent}
                  currentRate={result.firingRate}
                  pending={curvePending}
                  reduced={reduced}
                />
                <section aria-labelledby="notes-heading" className="sketch bg-paper-2/60 px-5 py-5">
                  <h2 id="notes-heading" className="hand text-[26px] leading-none">
                    notes on this run
                  </h2>
                  <ul className="mt-3 space-y-2 text-[15px] leading-relaxed">
                    {insights.map((insight) => (
                      <li key={insight} className="grid grid-cols-[1rem_1fr] gap-2">
                        <span aria-hidden="true">–</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </>
            ) : (
              <p className="text-[15px] text-graphite">The figures appear when every parameter is valid.</p>
            )}
          </div>
        </div>
        <div className="mt-20">
          <ModelExplanation />
        </div>
      </main>
      <Footer />
    </div>
  );
}
