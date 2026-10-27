"use client";

import { useIsClient } from "@/hooks/useMediaQuery";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartInk } from "@/lib/palette";
import type { FiringRatePoint } from "@/lib/simulation-types";
import { ChartFrame, ChartTooltipBox } from "@/components/simulator/ChartFrame";

const axisTick = { fill: chartInk.graphite, fontSize: 11 };

function RateTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: FiringRatePoint }>;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <ChartTooltipBox>
      <p className="font-mono">{point.current.toFixed(2)} nA</p>
      <p className="mt-0.5 font-mono font-medium">{point.firingRate.toFixed(1)} spikes/s</p>
      <p className="mt-0.5 text-graphite">{point.spikeCount} spikes in this run</p>
    </ChartTooltipBox>
  );
}

export function FiringRateChart({
  curve,
  inputCurrent,
  currentRate,
  pending,
  reduced,
}: {
  curve: FiringRatePoint[];
  inputCurrent: number;
  /** Rate of the run at exactly `inputCurrent`, which usually falls between the 0.5 nA samples. */
  currentRate: number;
  pending: boolean;
  reduced: boolean;
}) {
  const ready = useIsClient();
  const peak = curve.reduce((max, point) => Math.max(max, point.firingRate), currentRate);

  return (
    <ChartFrame
      id="rate-heading"
      figure="Fig. II.2"
      title="Firing-rate curve"
      note={
        <>
          Each open circle is a separate run of the same integrator at that current, with every other
          parameter as you set it. The line only joins those calculated samples, and glides to its new
          shape when you change a parameter. The solid dot is your run at exactly{" "}
          {inputCurrent.toFixed(2)} nA: {currentRate.toFixed(1)} spikes/s.{pending ? " Updating…" : ""}
        </>
      }
    >
      <p className="sr-only">
        Firing rate versus input current from 0 to 10 nanoamps.
        {curve.map((point) => ` ${point.current} nA, ${point.firingRate.toFixed(1)} spikes per second.`)}
      </p>
      <div className={`ink-chart h-[270px] w-full min-w-0 transition-opacity sm:h-[310px] ${pending ? "opacity-55" : "opacity-100"}`}>
        {ready ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curve} margin={{ top: 14, right: 16, left: 2, bottom: 14 }}>
              <CartesianGrid stroke={chartInk.rule} strokeDasharray="2 5" vertical={false} />
              <XAxis
                dataKey="current"
                type="number"
                domain={[0, 10]}
                ticks={[0, 2, 4, 6, 8, 10]}
                stroke={chartInk.ink}
                tick={axisTick}
                tickLine={{ stroke: chartInk.ink }}
                label={{ value: "input current (nA)", position: "insideBottom", offset: -8, className: "hand", fill: chartInk.ink, fontSize: 18 }}
              />
              <YAxis
                domain={[0, Math.max(10, Math.ceil((peak * 1.1) / 10) * 10)]}
                stroke={chartInk.ink}
                tick={axisTick}
                tickLine={{ stroke: chartInk.ink }}
                width={46}
                label={{ value: "spikes/s", angle: -90, position: "insideLeft", className: "hand", fill: chartInk.ink, fontSize: 18 }}
              />
              <Tooltip content={<RateTooltip />} />
              <ReferenceLine
                x={inputCurrent}
                stroke={chartInk.ink}
                strokeDasharray="6 5"
                label={{ value: "your current", position: "insideTopLeft", className: "hand", fill: chartInk.ink, fontSize: 19 }}
              />
              <Line
                type="linear"
                dataKey="firingRate"
                name="Firing rate"
                stroke={chartInk.ink}
                strokeWidth={1.3}
                dot={{ r: 3.2, fill: chartInk.paper, stroke: chartInk.ink, strokeWidth: 1.3 }}
                activeDot={{ r: 4.5, fill: chartInk.ink, stroke: chartInk.ink }}
                isAnimationActive={!reduced}
                animationDuration={380}
                animationEasing="ease-out"
              />
              <ReferenceDot
                x={inputCurrent}
                y={currentRate}
                r={6}
                fill={chartInk.ink}
                stroke={chartInk.paper}
                strokeWidth={2}
                ifOverflow="extendDomain"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : null}
      </div>
    </ChartFrame>
  );
}
