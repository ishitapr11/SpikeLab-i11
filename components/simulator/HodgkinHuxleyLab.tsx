"use client";

import { useId, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useIsClient } from "@/hooks/useMediaQuery";
import { ChartFrame, ChartTooltipBox } from "@/components/simulator/ChartFrame";
import { MetricCard } from "@/components/simulator/MetricCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { chartInk } from "@/lib/palette";
import {
  DEFAULT_HH_PARAMETERS,
  HH_PARAMETER_SPECS,
  HH_PRESETS,
  simulateHodgkinHuxley,
  type HodgkinHuxleySpec,
} from "@/lib/hodgkin-huxley";

interface StimulusSettings {
  stimulusCurrent: number;
  stimulusDuration: number;
}

interface HHPoint {
  t: number;
  v: number;
  m: number;
  h: number;
  n: number;
}

const DEFAULT_STIMULUS: StimulusSettings = {
  stimulusCurrent: DEFAULT_HH_PARAMETERS.stimulusCurrent,
  stimulusDuration: DEFAULT_HH_PARAMETERS.stimulusDuration,
};

const PRESET_NOTES: Record<string, string> = {
  subthreshold: "a weak, long push: the voltage bumps up and settles back, no spike",
  "single-spike": "a short, strong pulse: one spike, then recovery",
  "repeated-firing": "a strong, long push: the neuron keeps firing",
};

const SLIDER_NOTES: Record<HodgkinHuxleySpec["key"], string> = {
  stimulusCurrent:
    "How hard the stimulus pushes charge into the membrane. With a 40 ms stimulus, 1.5 does nothing and 2.5 already fires.",
  stimulusDuration:
    "How long the current stays on. A brief pulse can trigger one spike, and a long one can trigger repeated spikes.",
};

const axisTick = { fill: chartInk.graphite, fontSize: 11 };
const TIME_TICKS = [0, 10, 20, 30, 40, 50, 60];

function VoltageTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: HHPoint }>;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <ChartTooltipBox>
      <p className="font-mono">{point.t.toFixed(1)} ms</p>
      <p className="mt-0.5 font-mono font-medium">{point.v.toFixed(1)} mV</p>
    </ChartTooltipBox>
  );
}

function GateTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: HHPoint }>;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <ChartTooltipBox>
      <p className="font-mono">{point.t.toFixed(1)} ms</p>
      <p className="mt-0.5 font-mono">m {point.m.toFixed(3)}</p>
      <p className="font-mono">h {point.h.toFixed(3)}</p>
      <p className="font-mono">n {point.n.toFixed(3)}</p>
    </ChartTooltipBox>
  );
}

function GateLegend() {
  const items = [
    { label: "m, sodium activation", dash: undefined },
    { label: "h, sodium inactivation", dash: "6 4" },
    { label: "n, potassium activation", dash: "2 3" },
  ];
  return (
    <ul className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-ink-2" aria-label="Legend">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <svg width="26" height="8" aria-hidden="true">
            <line
              x1="0"
              y1="4"
              x2="26"
              y2="4"
              stroke={chartInk.ink}
              strokeWidth="1.6"
              strokeDasharray={item.dash}
            />
          </svg>
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function HodgkinHuxleySlider({
  spec,
  value,
  onChange,
}: {
  spec: HodgkinHuxleySpec;
  value: number;
  onChange: (value: number) => void;
}) {
  const rangeId = useId();
  return (
    <div className="py-3.5">
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={rangeId} className="text-[15px]">
          {spec.label}
        </label>
        <span className="font-mono text-[14px] tabular-nums">
          {value.toFixed(spec.decimals)}
          <span className="ml-1 text-[11px] text-graphite">{spec.unit}</span>
        </span>
      </div>
      <input
        id={rangeId}
        className="mt-2.5"
        type="range"
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={value}
        aria-describedby={`${rangeId}-help`}
        aria-valuetext={`${value.toFixed(spec.decimals)} ${spec.unit}`}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div
        className="mt-0.5 flex justify-between font-mono text-[10px] text-faint tabular-nums"
        aria-hidden="true"
      >
        <span>{spec.min}</span>
        <span>{spec.max}</span>
      </div>
      <p id={`${rangeId}-help`} className="mt-1 text-[13px] leading-snug text-graphite">
        {SLIDER_NOTES[spec.key]}
      </p>
    </div>
  );
}

export function HodgkinHuxleyLab() {
  const ready = useIsClient();
  const [stimulus, setStimulus] = useState<StimulusSettings>(DEFAULT_STIMULUS);

  const result = useMemo(
    () => simulateHodgkinHuxley({ ...DEFAULT_HH_PARAMETERS, ...stimulus }),
    [stimulus],
  );
  const points = useMemo<HHPoint[]>(
    () =>
      result.times.map((t, i) => ({
        t,
        v: result.voltages[i],
        m: result.m[i],
        h: result.h[i],
        n: result.n[i],
      })),
    [result],
  );

  const activePreset = HH_PRESETS.find(
    (preset) =>
      preset.stimulusCurrent === stimulus.stimulusCurrent &&
      preset.stimulusDuration === stimulus.stimulusDuration,
  );
  const stimulusEnd = Math.min(
    DEFAULT_HH_PARAMETERS.stimulusStart + stimulus.stimulusDuration,
    DEFAULT_HH_PARAMETERS.simulationDuration,
  );
  const charge = stimulus.stimulusCurrent * stimulus.stimulusDuration;

  return (
    <>
      <div className="rule mt-6" aria-hidden="true" />
      <div className="grid sm:grid-cols-3 sm:divide-x sm:divide-rule" aria-live="polite">
        <MetricCard
          label="Spike count"
          value={String(result.spikeCount)}
          detail={
            result.timeToFirstSpike === null
              ? "No spike: the voltage never crossed 0 mV."
              : `First spike at ${result.timeToFirstSpike.toFixed(1)} ms.`
          }
        />
        <MetricCard
          label="Peak voltage"
          value={result.peakVoltage.toFixed(1)}
          unit="mV"
          detail="The highest voltage reached. A real spike peaks near +40 mV."
        />
        <MetricCard
          label="Charge delivered"
          value={charge.toFixed(1)}
          unit="nC/cm²"
          detail="Stimulus current times duration."
        />
      </div>
      <div className="rule" aria-hidden="true" />

      <div className="mt-10 grid items-start gap-12 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-14">
        <div className="lg:sticky lg:top-24 lg:max-h-[calc(100svh-7rem)] lg:overflow-y-auto lg:pr-3">
          <section aria-labelledby="hh-controls-heading">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="eyebrow">Controls</p>
                <h2 id="hh-controls-heading" className="mt-1 font-display text-[30px] leading-none">
                  Stimulus
                </h2>
              </div>
              <Button variant="outline" size="small" onClick={() => setStimulus(DEFAULT_STIMULUS)}>
                Restore defaults
              </Button>
            </div>
            <div className="rule mt-3" aria-hidden="true" />

            <div className="mt-4" role="group" aria-label="Stimulus presets">
              <p className="eyebrow">Presets</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {HH_PRESETS.map((preset) => {
                  const active = activePreset?.id === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      aria-pressed={active}
                      className={cn(
                        "px-2.5 py-1.5 text-[14px]",
                        active ? "sketch bg-ink text-paper" : "sketch sketch-quiet text-ink-2 hover:text-ink",
                      )}
                      onClick={() =>
                        setStimulus({
                          stimulusCurrent: preset.stimulusCurrent,
                          stimulusDuration: preset.stimulusDuration,
                        })
                      }
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
              <p className="hand mt-2.5 min-h-[2.6em] text-[19px] leading-tight text-ink-2" aria-live="polite">
                {activePreset ? PRESET_NOTES[activePreset.id] : "custom settings — no preset matches"}
              </p>
            </div>

            <div className="mt-2 divide-y divide-rule">
              {HH_PARAMETER_SPECS.map((spec) => (
                <HodgkinHuxleySlider
                  key={spec.key}
                  spec={spec}
                  value={stimulus[spec.key]}
                  onChange={(value) => setStimulus((current) => ({ ...current, [spec.key]: value }))}
                />
              ))}
            </div>
            <p className="mt-2 text-[12.5px] leading-snug text-graphite">
              The membrane parameters are fixed at the standard squid-axon values. Only the stimulus
              changes here.
            </p>
          </section>
        </div>

        <div className="min-w-0 space-y-12">
          <ChartFrame
            id="hh-voltage-heading"
            figure="Fig. III.1"
            title="Membrane voltage"
            note={
              <>
                The voltage comes from the four Hodgkin-Huxley equations, stepped every 0.01 ms. The
                shaded band marks when the stimulus current is on. Sodium rushes in to drive the
                upstroke, then potassium flows out and brings the voltage back down below rest.
              </>
            }
          >
            <p className="sr-only">
              Membrane voltage from 0 to 60 milliseconds. {result.spikeCount} spikes, peak{" "}
              {result.peakVoltage.toFixed(1)} millivolts.
            </p>
            <div className="ink-chart h-[270px] w-full min-w-0 sm:h-[310px]">
              {ready ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={points} margin={{ top: 14, right: 16, left: 2, bottom: 14 }}>
                    <CartesianGrid stroke={chartInk.rule} strokeDasharray="2 5" vertical={false} />
                    <XAxis
                      dataKey="t"
                      type="number"
                      domain={[0, 60]}
                      ticks={TIME_TICKS}
                      stroke={chartInk.ink}
                      tick={axisTick}
                      tickLine={{ stroke: chartInk.ink }}
                      label={{ value: "time (ms)", position: "insideBottom", offset: -8, className: "hand", fill: chartInk.ink, fontSize: 18 }}
                    />
                    <YAxis
                      domain={[-90, 60]}
                      ticks={[-80, -40, 0, 40]}
                      stroke={chartInk.ink}
                      tick={axisTick}
                      tickLine={{ stroke: chartInk.ink }}
                      width={46}
                      label={{ value: "mV", angle: -90, position: "insideLeft", className: "hand", fill: chartInk.ink, fontSize: 18 }}
                    />
                    <Tooltip content={<VoltageTooltip />} />
                    <ReferenceArea
                      x1={DEFAULT_HH_PARAMETERS.stimulusStart}
                      x2={stimulusEnd}
                      fill={chartInk.rule}
                      fillOpacity={0.45}
                      stroke="none"
                      label={
                        stimulus.stimulusDuration >= 8
                          ? { value: "stimulus on", position: "insideTopLeft", className: "hand", fill: chartInk.ink, fontSize: 18 }
                          : undefined
                      }
                    />
                    <Line
                      type="linear"
                      dataKey="v"
                      name="Voltage"
                      stroke={chartInk.ink}
                      strokeWidth={1.6}
                      dot={false}
                      activeDot={{ r: 4, fill: chartInk.ink, stroke: chartInk.ink }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </ChartFrame>

          <ChartFrame
            id="hh-gates-heading"
            figure="Fig. III.2"
            title="Gating variables"
            note={
              <>
                Each gate is the fraction of its channel parts that are open, from 0 to 1. The gate m
                opens fast and starts the upstroke, h closes more slowly and shuts the sodium channel,
                and n opens slowly to let potassium out.
              </>
            }
          >
            <GateLegend />
            <p className="sr-only">Gating variables m, h and n from 0 to 60 milliseconds.</p>
            <div className="ink-chart h-[230px] w-full min-w-0 sm:h-[260px]">
              {ready ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={points} margin={{ top: 14, right: 16, left: 2, bottom: 14 }}>
                    <CartesianGrid stroke={chartInk.rule} strokeDasharray="2 5" vertical={false} />
                    <XAxis
                      dataKey="t"
                      type="number"
                      domain={[0, 60]}
                      ticks={TIME_TICKS}
                      stroke={chartInk.ink}
                      tick={axisTick}
                      tickLine={{ stroke: chartInk.ink }}
                      label={{ value: "time (ms)", position: "insideBottom", offset: -8, className: "hand", fill: chartInk.ink, fontSize: 18 }}
                    />
                    <YAxis
                      domain={[0, 1]}
                      ticks={[0, 0.5, 1]}
                      stroke={chartInk.ink}
                      tick={axisTick}
                      tickLine={{ stroke: chartInk.ink }}
                      width={46}
                      label={{ value: "open", angle: -90, position: "insideLeft", className: "hand", fill: chartInk.ink, fontSize: 18 }}
                    />
                    <Tooltip content={<GateTooltip />} />
                    <Line type="linear" dataKey="m" name="m" stroke={chartInk.ink} strokeWidth={1.6} dot={false} isAnimationActive={false} />
                    <Line type="linear" dataKey="h" name="h" stroke={chartInk.ink} strokeWidth={1.6} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
                    <Line type="linear" dataKey="n" name="n" stroke={chartInk.ink} strokeWidth={1.6} strokeDasharray="2 3" dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </ChartFrame>
        </div>
      </div>
    </>
  );
}
