export interface VoltagePoint {
  time: number;
  voltage: number;
}

export interface SpikeMarker {
  time: number;
  marker: number;
}

/** Index of the sample whose time is closest to `target`. `times` must be ascending. */
export function nearestIndex(times: number[], target: number): number {
  if (times.length === 0) return 0;
  let low = 0;
  let high = times.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (times[mid] < target) low = mid + 1;
    else high = mid;
  }
  if (low > 0 && Math.abs(times[low - 1] - target) < Math.abs(times[low] - target)) {
    return low - 1;
  }
  return low;
}

/**
 * Reduce a trace for display without dropping spike resets.
 * Each bucket keeps its minimum and maximum sample, and every spike sample
 * plus the sample just before it is retained.
 */
export function downsampleTrace(
  times: number[],
  voltages: number[],
  spikeTimes: number[],
  maxPoints = 700,
): VoltagePoint[] {
  const count = Math.min(times.length, voltages.length);
  if (count === 0) return [];
  if (count <= maxPoints) {
    const points: VoltagePoint[] = [];
    for (let index = 0; index < count; index += 1) {
      points.push({ time: times[index], voltage: voltages[index] });
    }
    return points;
  }

  const bucketCount = Math.max(2, Math.floor(maxPoints / 2));
  const bucketSize = Math.ceil(count / bucketCount);
  const keep = new Set<number>([0, count - 1]);

  for (let start = 0; start < count; start += bucketSize) {
    const end = Math.min(count, start + bucketSize);
    let minIndex = start;
    let maxIndex = start;
    for (let index = start + 1; index < end; index += 1) {
      if (voltages[index] < voltages[minIndex]) minIndex = index;
      if (voltages[index] > voltages[maxIndex]) maxIndex = index;
    }
    keep.add(minIndex);
    keep.add(maxIndex);
  }

  for (const spikeTime of spikeTimes) {
    const index = nearestIndex(times, spikeTime);
    keep.add(index);
    if (index > 0) keep.add(index - 1);
  }

  return [...keep]
    .sort((a, b) => a - b)
    .map((index) => ({ time: times[index], voltage: voltages[index] }));
}

export function sliceTrace(
  times: number[],
  voltages: number[],
  start: number,
  end: number,
): { times: number[]; voltages: number[] } {
  const nextTimes: number[] = [];
  const nextVoltages: number[] = [];
  const count = Math.min(times.length, voltages.length);
  for (let index = 0; index < count; index += 1) {
    const time = times[index];
    if (time >= start && time <= end) {
      nextTimes.push(time);
      nextVoltages.push(voltages[index]);
    }
  }
  return { times: nextTimes, voltages: nextVoltages };
}

/** Markers sit on the threshold line. They are event ticks, not spike waveforms. */
export function spikeMarkers(spikeTimes: number[], threshold: number): SpikeMarker[] {
  return spikeTimes.map((time) => ({ time, marker: threshold }));
}

/** Round, evenly spaced axis ticks (steps of 1, 2 or 5 × 10^k) covering [min, max]. */
export function niceTicks(min: number, max: number, target = 6): number[] {
  const span = max - min;
  if (!(span > 0)) return [min];
  const raw = span / target;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalised = raw / magnitude;
  const step = (normalised < 1.5 ? 1 : normalised < 3 ? 2 : normalised < 7 ? 5 : 10) * magnitude;
  const ticks: number[] = [];
  for (let value = Math.ceil(min / step) * step; value <= max + step * 1e-6; value += step) {
    ticks.push(Number(value.toFixed(6)));
  }
  return ticks;
}
