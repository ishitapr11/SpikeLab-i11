"use client";

import { motion } from "motion/react";
import { useMemo } from "react";
import { simulate } from "@/lib/neuron-model";
import { DEFAULT_PARAMETERS } from "@/lib/parameter-specs";

const WINDOW_MS = 120;
const VIEW = { width: 560, height: 330 };
const PLOT = { left: 58, right: 532, top: 40, bottom: 270 };
const V_MIN = -72;
const V_MAX = -38;

function x(time: number) {
  return PLOT.left + (time / WINDOW_MS) * (PLOT.right - PLOT.left);
}

function y(voltage: number) {
  return PLOT.bottom - ((voltage - V_MIN) / (V_MAX - V_MIN)) * (PLOT.bottom - PLOT.top);
}

/**
 * Fig. 1: the first 120 ms of the default simulation, computed by the same engine as the lab
 * and inked as a plate. Spikes are drawn as event strokes above threshold, as in the lab.
 */
export function HeroFigure({ reduced }: { reduced: boolean }) {
  const { path, spikes, threshold, rest } = useMemo(() => {
    const result = simulate({ ...DEFAULT_PARAMETERS, simulationDuration: WINDOW_MS });
    let d = "";
    for (let index = 0; index < result.times.length; index += 2) {
      d += `${index === 0 ? "M" : "L"}${x(result.times[index]).toFixed(1)} ${y(result.voltages[index]).toFixed(1)}`;
    }
    return {
      path: d,
      spikes: result.spikeTimes,
      threshold: DEFAULT_PARAMETERS.firingThreshold,
      rest: DEFAULT_PARAMETERS.restingPotential,
    };
  }, []);

  const draw = reduced
    ? { initial: false as const }
    : {
        initial: { pathLength: 0 },
        animate: { pathLength: 1 },
        transition: { duration: 2.4, ease: [0.4, 0, 0.2, 1] as const, delay: 0.35 },
      };
  const appear = (delay: number) =>
    reduced
      ? { initial: false as const }
      : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.5, delay } };

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
        className="h-auto w-full text-ink"
        role="img"
        aria-label={`Membrane voltage of the default model neuron over the first ${WINDOW_MS} milliseconds. The voltage climbs from rest toward threshold, resets, and repeats, giving ${spikes.length} spikes.`}
      >
        <g fill="none" stroke="currentColor" strokeLinecap="round" filter="url(#ink-wobble)">
          <path d={`M${PLOT.left} ${PLOT.top - 14} L${PLOT.left} ${PLOT.bottom} L${PLOT.right + 8} ${PLOT.bottom}`} strokeWidth="1.4" />
          <path d={`M${PLOT.right + 8} ${PLOT.bottom} l-7 -3.5 M${PLOT.right + 8} ${PLOT.bottom} l-7 3.5`} strokeWidth="1.2" />
          <path d={`M${PLOT.left} ${PLOT.top - 14} l-3.5 7 M${PLOT.left} ${PLOT.top - 14} l3.5 7`} strokeWidth="1.2" />
          {[0, 40, 80, 120].map((time) => (
            <path key={time} d={`M${x(time)} ${PLOT.bottom} v6`} strokeWidth="1" />
          ))}
          {[-70, -50].map((voltage) => (
            <path key={voltage} d={`M${PLOT.left - 6} ${y(voltage)} h6`} strokeWidth="1" />
          ))}
          <path
            d={`M${PLOT.left} ${y(threshold)} H${PLOT.right}`}
            strokeWidth="1"
            strokeDasharray="5 5"
          />
          <path d={`M${PLOT.left} ${y(rest)} H${PLOT.right}`} strokeWidth="0.8" strokeDasharray="1 4" opacity="0.7" />
        </g>

        <g className="font-mono" fontSize="10.5" fill="currentColor" opacity="0.75">
          {[0, 40, 80, 120].map((time) => (
            <text key={time} x={x(time)} y={PLOT.bottom + 20} textAnchor="middle">
              {time}
            </text>
          ))}
          <text x={PLOT.right + 8} y={PLOT.bottom + 20} textAnchor="end">
            ms
          </text>
          {[-70, -50].map((voltage) => (
            <text key={voltage} x={PLOT.left - 10} y={y(voltage) + 3.5} textAnchor="end">
              {voltage}
            </text>
          ))}
          <text x={PLOT.left - 10} y={PLOT.top - 16} textAnchor="end">
            mV
          </text>
        </g>

        <motion.path d={path} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" {...draw} />

        <motion.g {...appear(2.3)} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
          {spikes.map((time) => (
            <path key={time} d={`M${x(time)} ${y(threshold) - 4} V${y(threshold) - 26}`} />
          ))}
        </motion.g>

        <motion.g {...appear(2.6)} className="hand" fill="currentColor" fontSize="21">
          <text x={x(spikes[0] ?? 8) + 18} y={y(threshold) - 44}>
            each stroke, one spike
          </text>
          <path
            d={`M${x(spikes[0] ?? 8) + 14} ${y(threshold) - 48} q -10 2 -12 14`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.1"
            filter="url(#ink-wobble)"
          />
          <text x={PLOT.right - 4} y={y(threshold) + 22} textAnchor="end">
            threshold
          </text>
          <text x={PLOT.right - 4} y={y(rest) + 22} textAnchor="end">
            reset to rest
          </text>
        </motion.g>
      </svg>
      <figcaption className="figure-caption mt-2 max-w-md">
        Fig. 1. The first {WINDOW_MS} ms of the default model neuron, computed in your browser by the
        same integrator the lab uses: 3 nA into a 10 MΩ membrane with τ = 10 ms.
      </figcaption>
    </figure>
  );
}
