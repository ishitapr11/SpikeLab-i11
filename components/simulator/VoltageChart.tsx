"use client";

import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { downsampleTrace, nearestIndex, niceTicks, sliceTrace } from "@/lib/chart-data";
import { chartInk } from "@/lib/palette";
import type { SimulationResult } from "@/lib/simulation-types";
import { ChartFrame } from "@/components/simulator/ChartFrame";
import { useElementSize } from "@/hooks/useElementSize";
import { cn } from "@/lib/cn";

/** How many times slower than real time the sweep runs. The model itself is untouched. */
const SLOWDOWNS = [2, 10, 50, 200] as const;
const MARGIN = { left: 52, right: 74, top: 16, bottom: 82 };
/** Seconds the finished sweep rests on screen before it starts again. */
const HOLD_SECONDS = 1.4;
/** Real seconds a fresh spike stays emphasised, whatever the playback speed. */
const FLASH_SECONDS = 0.18;

interface Geometry {
  start: number;
  end: number;
  x: (time: number) => number;
  y: (voltage: number) => number;
  plotRight: number;
  meterTop: number;
  meterBottom: number;
  spikes: number[];
  times: number[];
  voltages: number[];
  threshold: number;
  rest: number;
  refractory: number;
  steadyState: number;
}

interface Hover {
  px: number;
  py: number;
  time: number;
  voltage: number;
}

function describe(geometry: Geometry, time: number, index: number, flashMs: number): string {
  let last = -Infinity;
  for (const spike of geometry.spikes) {
    if (spike <= time + 1e-9) last = spike;
    else break;
  }
  if (time - last < flashMs) return "threshold reached · spike";
  if (geometry.refractory > 0 && time - last < geometry.refractory) return "refractory · held at reset";
  const previous = geometry.voltages[Math.max(0, index - 1)];
  const rise = geometry.voltages[index] - previous;
  if (rise > 1e-4) return geometry.steadyState >= geometry.threshold ? "integrating toward threshold" : "rising toward steady state";
  if (rise < -1e-4) return "decaying";
  return geometry.steadyState >= geometry.threshold ? "integrating" : "steady below threshold";
}

/**
 * An oscilloscope-style sweep of the computed trace. A playhead runs across the recording at a
 * chosen slowdown; the line is inked behind it, spike marks appear as it passes them, and the
 * meter on the right shows the membrane voltage at the playhead. All values are samples from the
 * simulation result; only the playback speed is chosen here.
 */
export function VoltageChart({ result, reduced }: { result: SimulationResult; reduced: boolean }) {
  const [zoomed, setZoomed] = useState(false);
  const [playing, setPlaying] = useState(!reduced);
  const [slowdown, setSlowdown] = useState<number>(10);
  const [hover, setHover] = useState<Hover | null>(null);
  const { ref: boxRef, width, height } = useElementSize<HTMLDivElement>();
  const clipId = `sweep-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const hatchId = `${clipId}-hatch`;

  const firstSpike = result.timeToFirstSpike;
  const isZoomed = zoomed && firstSpike !== null;

  const view = useMemo(() => {
    if (!isZoomed || firstSpike === null) {
      return { start: 0, end: result.config.simulationDuration, times: result.times, voltages: result.voltages, spikes: result.spikeTimes };
    }
    const start = Math.max(0, firstSpike - 8);
    const end = Math.min(result.config.simulationDuration, firstSpike + 24);
    const slice = sliceTrace(result.times, result.voltages, start, end);
    return {
      start,
      end,
      times: slice.times,
      voltages: slice.voltages,
      spikes: result.spikeTimes.filter((time) => time >= start && time <= end),
    };
  }, [isZoomed, firstSpike, result]);

  const yMin = Math.min(result.config.restingPotential, result.voltageMin, result.config.firingThreshold) - 4;
  const yMax = Math.max(result.config.firingThreshold, result.voltageMax) + 5;

  const geometry = useMemo<Geometry | null>(() => {
    if (width < 120 || height < 120) return null;
    const plotRight = width - MARGIN.right;
    const plotBottom = height - MARGIN.bottom;
    const span = Math.max(view.end - view.start, 1e-6);
    const x = (time: number) => MARGIN.left + ((time - view.start) / span) * (plotRight - MARGIN.left);
    const y = (voltage: number) => MARGIN.top + ((yMax - voltage) / (yMax - yMin)) * (plotBottom - MARGIN.top);
    return {
      start: view.start,
      end: view.end,
      x,
      y,
      plotRight,
      meterTop: y(yMax),
      meterBottom: y(yMin),
      spikes: view.spikes,
      times: result.times,
      voltages: result.voltages,
      threshold: result.config.firingThreshold,
      rest: result.config.restingPotential,
      refractory: result.config.refractoryPeriod,
      steadyState: result.steadyStateVoltage,
    };
  }, [width, height, view, yMin, yMax, result]);

  const path = useMemo(() => {
    if (!geometry) return "";
    const points = downsampleTrace(view.times, view.voltages, view.spikes, Math.max(400, Math.round(width * 1.5)));
    let d = "";
    for (let index = 0; index < points.length; index += 1) {
      d += `${index === 0 ? "M" : "L"}${geometry.x(points[index].time).toFixed(1)} ${geometry.y(points[index].voltage).toFixed(1)}`;
    }
    return d;
  }, [geometry, view, width]);

  // ---- Playback: one requestAnimationFrame loop that writes straight to the SVG. ----
  const live = useRef({ t: reduced ? Number.POSITIVE_INFINITY : 0, hold: 0, playing: !reduced, slowdown: 10, restart: false });
  const geometryRef = useRef<Geometry | null>(null);
  const clipRect = useRef<SVGRectElement>(null);
  const playhead = useRef<SVGLineElement>(null);
  const playDot = useRef<SVGCircleElement>(null);
  const meterFill = useRef<SVGRectElement>(null);
  const meterMark = useRef<SVGPathElement>(null);
  const spikeDots = useRef<Array<SVGCircleElement | null>>([]);
  const spikeTicks = useRef<Array<SVGLineElement | null>>([]);
  const readTime = useRef<HTMLSpanElement>(null);
  const readVoltage = useRef<HTMLSpanElement>(null);
  const readCount = useRef<HTMLSpanElement>(null);
  const readState = useRef<HTMLSpanElement>(null);
  const redraw = useRef(true);

  useEffect(() => {
    live.current.playing = playing;
  }, [playing]);

  useEffect(() => {
    live.current.slowdown = slowdown;
  }, [slowdown]);

  useEffect(() => {
    geometryRef.current = geometry;
    const state = live.current;
    if (geometry) {
      if (state.restart) {
        state.t = geometry.start;
        state.hold = 0;
        state.restart = false;
      } else {
        state.t = Math.min(Math.max(state.t, geometry.start), geometry.end);
      }
    }
    redraw.current = true;
  }, [geometry, path]);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let shownT = Number.NaN;

    const setText = (element: HTMLElement | null, text: string) => {
      if (element && element.textContent !== text) element.textContent = text;
    };

    const draw = (geometryNow: Geometry, t: number) => {
      const px = geometryNow.x(t);
      clipRect.current?.setAttribute("width", Math.max(0, px - MARGIN.left + 1).toFixed(1));
      playhead.current?.setAttribute("x1", px.toFixed(1));
      playhead.current?.setAttribute("x2", px.toFixed(1));
      const index = nearestIndex(geometryNow.times, t);
      const voltage = geometryNow.voltages[index] ?? geometryNow.rest;
      const py = geometryNow.y(voltage);
      playDot.current?.setAttribute("cx", px.toFixed(1));
      playDot.current?.setAttribute("cy", py.toFixed(1));
      meterFill.current?.setAttribute("y", py.toFixed(1));
      meterFill.current?.setAttribute("height", Math.max(0, geometryNow.meterBottom - py).toFixed(1));
      meterMark.current?.setAttribute("transform", `translate(0 ${py.toFixed(1)})`);

      const flashMs = (FLASH_SECONDS * 1000) / live.current.slowdown;
      let fired = 0;
      geometryNow.spikes.forEach((spike, k) => {
        const on = spike <= t + 1e-9;
        if (on) fired += 1;
        const fresh = on && t - spike < flashMs;
        const dot = spikeDots.current[k];
        if (dot) {
          dot.style.opacity = on ? "1" : "0";
          dot.setAttribute("r", fresh ? "6.5" : "3.4");
          dot.setAttribute("fill", fresh ? chartInk.ink : chartInk.paper);
        }
        const tick = spikeTicks.current[k];
        if (tick) tick.style.opacity = on ? "1" : "0";
      });

      setText(readTime.current, `${t.toFixed(1)} ms`);
      setText(readVoltage.current, `${voltage.toFixed(2)} mV`);
      setText(readCount.current, String(fired));
      setText(readState.current, describe(geometryNow, t, index, flashMs));
    };

    const tick = (now: number) => {
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;
      const state = live.current;
      const geometryNow = geometryRef.current;
      if (geometryNow) {
        if (state.playing) {
          if (state.hold > 0) {
            state.hold -= delta;
            if (state.hold <= 0) state.t = geometryNow.start;
          } else {
            state.t += (delta * 1000) / state.slowdown;
            if (state.t >= geometryNow.end) {
              state.t = geometryNow.end;
              state.hold = HOLD_SECONDS;
            }
          }
        }
        const t = Math.min(Math.max(state.t, geometryNow.start), geometryNow.end);
        if (t !== shownT || redraw.current) {
          draw(geometryNow, t);
          shownT = t;
          redraw.current = false;
        }
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const restart = () => {
    const geometryNow = geometryRef.current;
    live.current.t = geometryNow ? geometryNow.start : 0;
    live.current.hold = 0;
    setPlaying(true);
  };

  const showWhole = () => {
    live.current.t = geometryRef.current ? geometryRef.current.end : Number.POSITIVE_INFINITY;
    live.current.hold = 0;
    setPlaying(false);
  };

  const chooseWindow = (next: boolean) => {
    if (next === zoomed) return;
    live.current.restart = true;
    setZoomed(next);
    setSlowdown(next ? 200 : 10);
  };

  const onPointerMove = (event: React.PointerEvent<SVGRectElement>) => {
    if (!geometry) return;
    const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!bounds) return;
    const px = Math.min(Math.max(event.clientX - bounds.left, MARGIN.left), geometry.plotRight);
    const time = geometry.start + ((px - MARGIN.left) / (geometry.plotRight - MARGIN.left)) * (geometry.end - geometry.start);
    const index = nearestIndex(result.times, time);
    const voltage = result.voltages[index];
    setHover({ px: geometry.x(result.times[index]), py: geometry.y(voltage), time: result.times[index], voltage });
  };

  const xTicks = geometry ? niceTicks(view.start, view.end, width < 520 ? 4 : 7) : [];
  const yTicks = geometry ? niceTicks(yMin, yMax, 5) : [];
  const plotBottom = height - MARGIN.bottom;
  const stripTop = plotBottom + 34;
  const meterX = width - MARGIN.right + 30;

  const segment = (active: boolean) =>
    cn("px-2.5 py-1 text-[13px]", active ? "sketch bg-ink text-paper" : "text-ink-2 hover:text-ink");

  return (
    <ChartFrame
      id="voltage-heading"
      figure="Fig. II.1"
      title="Membrane voltage, live"
      note={
        <>
          The sweep replays the computed trace slower than real time so you can watch it integrate,
          cross threshold, reset and wait out the refractory period. Change a slider mid-sweep and the
          trace redraws under the playhead. Open circles mark spike times; they are events, not a
          sodium-spike waveform.
        </>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="ink-btn ink-btn-solid ink-btn-small"
            onClick={() => (playing ? setPlaying(false) : setPlaying(true))}
            aria-pressed={playing}
          >
            {playing ? <Pause size={13} strokeWidth={1.8} /> : <Play size={13} strokeWidth={1.8} />}
            {playing ? "Pause sweep" : "Play sweep"}
          </button>
          <button type="button" className="ink-btn ink-btn-outline ink-btn-small" onClick={restart}>
            <RotateCcw size={13} strokeWidth={1.6} />
            From the start
          </button>
          <button type="button" className="ink-btn ink-btn-outline ink-btn-small" onClick={showWhole}>
            <SkipForward size={13} strokeWidth={1.6} />
            Whole trace
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-1" role="group" aria-label="Playback slowdown">
            <span className="eyebrow mr-1">Slowed</span>
            {SLOWDOWNS.map((factor) => (
              <button
                key={factor}
                type="button"
                aria-pressed={slowdown === factor}
                className={segment(slowdown === factor)}
                onClick={() => setSlowdown(factor)}
              >
                {factor}×
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1" role="group" aria-label="Voltage time window">
            <button type="button" aria-pressed={!isZoomed} className={segment(!isZoomed)} onClick={() => chooseWindow(false)}>
              Full recording
            </button>
            <button
              type="button"
              aria-pressed={isZoomed}
              disabled={firstSpike === null}
              className={cn(segment(isZoomed), "disabled:cursor-not-allowed disabled:opacity-40")}
              onClick={() => chooseWindow(true)}
            >
              First spike
            </button>
          </div>
        </div>
      </div>

      <div
        className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 border-y border-rule py-2 font-mono text-[13px] tabular-nums sm:grid-cols-[auto_auto_auto_1fr]"
        aria-hidden="true"
      >
        <span>
          <span className="text-graphite">t </span>
          <span ref={readTime}>0.0 ms</span>
        </span>
        <span>
          <span className="text-graphite">V </span>
          <span ref={readVoltage} className="font-medium">
            —
          </span>
        </span>
        <span>
          <span className="text-graphite">spikes </span>
          <span ref={readCount}>0</span>
        </span>
        <span className="hand text-[18px] leading-none sm:text-right" ref={readState} />
      </div>
      <p className="sr-only">
        Voltage sampled every {result.dt} ms from 0 to {result.config.simulationDuration} ms. {result.spikeCount} spikes.
        Threshold {result.config.firingThreshold} mV. Rest {result.config.restingPotential} mV.
      </p>

      <div ref={boxRef} className="relative mt-3 h-[330px] w-full min-w-0 sm:h-[410px]">
        {geometry ? (
          <svg width={width} height={height} className="block overflow-visible text-ink" role="img" aria-label="Membrane voltage against time, with a moving playhead">
            <defs>
              <clipPath id={clipId}>
                <rect ref={clipRect} x={MARGIN.left - 1} y={0} width={0} height={height} />
              </clipPath>
              <pattern id={hatchId} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="5" stroke={chartInk.ink} strokeWidth="1.4" />
              </pattern>
            </defs>

            <g filter="url(#ink-wobble)" fill="none" strokeLinecap="round">
              {yTicks.map((tick) => (
                <line key={`g${tick}`} x1={MARGIN.left} x2={geometry.plotRight} y1={geometry.y(tick)} y2={geometry.y(tick)} stroke={chartInk.rule} strokeDasharray="2 5" />
              ))}
              <path d={`M${MARGIN.left} ${MARGIN.top - 6} V${plotBottom} H${geometry.plotRight + 6}`} stroke={chartInk.ink} strokeWidth="1.3" />
              {xTicks.map((tick) => (
                <line key={`x${tick}`} x1={geometry.x(tick)} x2={geometry.x(tick)} y1={plotBottom} y2={plotBottom + 5} stroke={chartInk.ink} />
              ))}
              {yTicks.map((tick) => (
                <line key={`y${tick}`} x1={MARGIN.left - 5} x2={MARGIN.left} y1={geometry.y(tick)} y2={geometry.y(tick)} stroke={chartInk.ink} />
              ))}
              <line x1={MARGIN.left} x2={geometry.plotRight} y1={geometry.y(result.config.firingThreshold)} y2={geometry.y(result.config.firingThreshold)} stroke={chartInk.ink} strokeDasharray="6 5" />
              <line x1={MARGIN.left} x2={geometry.plotRight} y1={geometry.y(result.config.restingPotential)} y2={geometry.y(result.config.restingPotential)} stroke={chartInk.graphite} strokeDasharray="1 4" />
              <line x1={MARGIN.left} x2={geometry.plotRight} y1={stripTop + 22} y2={stripTop + 22} stroke={chartInk.ink} />
            </g>

            <g className="font-mono" fontSize="11" fill={chartInk.graphite}>
              {xTicks.map((tick) => (
                <text key={tick} x={geometry.x(tick)} y={plotBottom + 18} textAnchor="middle">
                  {Math.round(tick * 10) / 10}
                </text>
              ))}
              {yTicks.map((tick) => (
                <text key={tick} x={MARGIN.left - 9} y={geometry.y(tick) + 3.5} textAnchor="end">
                  {Math.round(tick)}
                </text>
              ))}
            </g>
            <g className="hand" fontSize="18" fill={chartInk.ink}>
              <text x={MARGIN.left - 9} y={MARGIN.top - 2} textAnchor="end">mV</text>
              <text x={(MARGIN.left + geometry.plotRight) / 2} y={height - 6} textAnchor="middle">time (ms)</text>
              <text x={MARGIN.left - 9} y={stripTop + 19} textAnchor="end">spikes</text>
              <text x={geometry.plotRight - 4} y={geometry.y(result.config.firingThreshold) - 7} textAnchor="end">threshold</text>
              <text x={geometry.plotRight - 4} y={geometry.y(result.config.restingPotential) + 18} textAnchor="end" fill={chartInk.graphite}>rest</text>
            </g>

            {/* The whole trace, faint, so the shape ahead of the playhead stays readable. */}
            <path d={path} fill="none" stroke={chartInk.ink} strokeOpacity="0.14" strokeWidth="1.2" strokeLinejoin="round" />
            <path d={path} fill="none" stroke={chartInk.ink} strokeWidth="1.6" strokeLinejoin="round" clipPath={`url(#${clipId})`} />

            {view.spikes.map((time, k) => (
              <g key={`s${time}`}>
                <circle
                  ref={(node) => {
                    spikeDots.current[k] = node;
                  }}
                  cx={geometry.x(time)}
                  cy={geometry.y(result.config.firingThreshold)}
                  r="3.4"
                  fill={chartInk.paper}
                  stroke={chartInk.ink}
                  strokeWidth="1.4"
                  style={{ opacity: 0, transition: "r 140ms ease-out, fill 140ms" }}
                />
                <line
                  ref={(node) => {
                    spikeTicks.current[k] = node;
                  }}
                  x1={geometry.x(time)}
                  x2={geometry.x(time)}
                  y1={stripTop + 2 + (k % 3)}
                  y2={stripTop + 20}
                  stroke={chartInk.ink}
                  strokeWidth="1.4"
                  style={{ opacity: 0 }}
                />
              </g>
            ))}

            <line ref={playhead} y1={MARGIN.top - 6} y2={stripTop + 22} stroke={chartInk.ink} strokeWidth="1" strokeDasharray="3 3" opacity="0.65" />
            <circle ref={playDot} r="4.2" fill={chartInk.paper} stroke={chartInk.ink} strokeWidth="1.8" />

            {/* Voltage meter: hatched ink rises with the membrane and drops at each reset. */}
            <g>
              <rect x={meterX} y={geometry.meterTop} width="13" height={geometry.meterBottom - geometry.meterTop} fill="none" stroke={chartInk.ink} strokeWidth="1.3" filter="url(#ink-wobble)" />
              <rect ref={meterFill} x={meterX + 1.5} width="10" y={geometry.meterBottom} height="0" fill={`url(#${hatchId})`} />
              <line x1={meterX - 5} x2={meterX + 18} y1={geometry.y(result.config.firingThreshold)} y2={geometry.y(result.config.firingThreshold)} stroke={chartInk.ink} strokeDasharray="3 2" />
              <path ref={meterMark} d={`M${meterX - 9} -4 L${meterX - 2} 0 L${meterX - 9} 4 Z`} fill={chartInk.ink} />
              <text x={meterX + 6.5} y={geometry.meterTop - 8} textAnchor="middle" className="font-display" fontStyle="italic" fontSize="17" fill={chartInk.ink}>
                V
              </text>
            </g>

            {hover ? (
              <g pointerEvents="none">
                <line x1={hover.px} x2={hover.px} y1={MARGIN.top} y2={plotBottom} stroke={chartInk.ink} strokeDasharray="1 3" />
                <circle cx={hover.px} cy={hover.py} r="3.5" fill={chartInk.ink} />
              </g>
            ) : null}
            <rect
              x={MARGIN.left}
              y={MARGIN.top}
              width={Math.max(0, geometry.plotRight - MARGIN.left)}
              height={Math.max(0, plotBottom - MARGIN.top)}
              fill="transparent"
              onPointerMove={onPointerMove}
              onPointerLeave={() => setHover(null)}
            />
          </svg>
        ) : null}
        {hover && geometry ? (
          <div
            className="sketch pointer-events-none absolute bg-paper px-3 py-2 text-[12px] shadow-[3px_3px_0_rgba(25,24,20,0.12)]"
            style={{
              left: Math.min(hover.px + 12, width - 150),
              top: Math.max(hover.py - 56, 0),
            }}
          >
            <p className="font-mono">{hover.time.toFixed(1)} ms</p>
            <p className="mt-0.5 font-mono font-medium">{hover.voltage.toFixed(2)} mV</p>
          </div>
        ) : null}
      </div>
    </ChartFrame>
  );
}
