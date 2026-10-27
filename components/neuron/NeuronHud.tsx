"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import { ANATOMY, ANATOMY_IDS, type AnatomyId } from "@/lib/anatomy";
import { clampZoom, type NeuronViewState } from "@/components/neuron/scene-types";

const control =
  "grid h-8 w-8 place-items-center text-ink transition-transform hover:-translate-y-px focus-visible:-translate-y-px";

export function NeuronHud({
  viewRef,
  selected,
  onSelect,
  figure,
  compact = false,
}: {
  viewRef: React.RefObject<NeuronViewState>;
  selected: AnatomyId | null;
  onSelect: (id: AnatomyId | null) => void;
  figure: string;
  compact?: boolean;
}) {
  const bumpZoom = (factor: number) => {
    viewRef.current.zoom = clampZoom(viewRef.current.zoom * factor);
  };

  const reset = () => {
    viewRef.current.rotX = 0;
    viewRef.current.rotY = 0;
    viewRef.current.zoom = 1;
    onSelect(null);
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col gap-1.5 px-4 pb-2.5 lg:px-8 lg:pb-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="sketch pointer-events-auto flex bg-paper/90 px-1" role="group" aria-label="View">
          <button type="button" className={control} onClick={() => bumpZoom(0.88)} aria-label="Zoom in">
            <Plus size={15} strokeWidth={1.6} />
          </button>
          <button type="button" className={control} onClick={() => bumpZoom(1.12)} aria-label="Zoom out">
            <Minus size={15} strokeWidth={1.6} />
          </button>
          <button type="button" className={control} onClick={reset} aria-label="Reset view">
            <RotateCcw size={14} strokeWidth={1.6} />
          </button>
        </div>
        <label className="pointer-events-auto flex items-center gap-2 text-sm">
          <span className="eyebrow">Inspect</span>
          <select
            className="ink-link ink-link-static cursor-pointer bg-transparent pr-1 font-serif text-[15px] text-ink outline-none"
            value={selected ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              onSelect(value === "" ? null : (value as AnatomyId));
            }}
            aria-label="Select an anatomical structure"
          >
            <option value="">the whole cell</option>
            {ANATOMY_IDS.map((id) => (
              <option key={id} value={id}>
                {ANATOMY[id].label}
              </option>
            ))}
          </select>
        </label>
        <p className="hand hidden text-[19px] text-ink-2 sm:block" aria-hidden="true">
          drag to turn the cell ↻
        </p>
      </div>
      {compact ? null : <p className="figure-caption max-w-xl">{figure}</p>}
      <p className="sr-only">Drag to rotate the drawing. Pinch, or hold Alt and scroll, to zoom.</p>
    </div>
  );
}
