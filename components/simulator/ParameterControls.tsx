"use client";

import { PARAMETER_SPECS, parametersEqual } from "@/lib/parameter-specs";
import { SIMULATION_PRESETS } from "@/lib/simulation-presets";
import type { NeuronParameters, ParameterKey } from "@/lib/simulation-types";
import { ParameterSlider } from "@/components/simulator/ParameterSlider";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export function ParameterControls({
  parameters,
  onChange,
  onReplace,
  onRestore,
}: {
  parameters: NeuronParameters;
  onChange: (key: ParameterKey, value: number) => void;
  onReplace: (parameters: NeuronParameters) => void;
  onRestore: () => void;
}) {
  const activePreset = SIMULATION_PRESETS.find((preset) => parametersEqual(parameters, preset.parameters));

  return (
    <section aria-labelledby="parameters-heading">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Controls</p>
          <h2 id="parameters-heading" className="mt-1 font-display text-[30px] leading-none">
            Parameters
          </h2>
        </div>
        <Button variant="outline" size="small" onClick={onRestore}>
          Restore defaults
        </Button>
      </div>
      <div className="rule mt-3" aria-hidden="true" />

      <div className="mt-4" role="group" aria-label="Parameter presets">
        <p className="eyebrow">Presets</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SIMULATION_PRESETS.map((preset) => {
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
                onClick={() => onReplace(preset.parameters)}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <p className="hand mt-2.5 min-h-[2.6em] text-[19px] leading-tight text-ink-2" aria-live="polite">
          {activePreset ? activePreset.description : "custom settings — no preset matches"}
        </p>
      </div>

      <div className="mt-2 divide-y divide-rule">
        {PARAMETER_SPECS.map((spec) => (
          <ParameterSlider
            key={spec.key}
            name={spec.key}
            value={parameters[spec.key]}
            onChange={(value) => onChange(spec.key, value)}
          />
        ))}
      </div>
      <p className="mt-2 text-[12.5px] leading-snug text-graphite">
        Focus a slider and use the arrow keys, or type a value and press Enter. Values outside the
        range are rejected with an explanation.
      </p>
    </section>
  );
}
