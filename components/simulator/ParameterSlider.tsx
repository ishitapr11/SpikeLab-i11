"use client";

import { useId, useState } from "react";
import { SPEC_BY_KEY } from "@/lib/parameter-specs";
import type { ParameterKey } from "@/lib/simulation-types";
import { ParameterSymbol } from "@/components/ui/ParameterSymbol";

export function ParameterSlider({
  name,
  value,
  onChange,
}: {
  name: ParameterKey;
  value: number;
  onChange: (value: number) => void;
}) {
  const spec = SPEC_BY_KEY[name];
  const rangeId = useId();
  const errorId = useId();
  const formatted = value.toFixed(spec.decimals);
  const [draft, setDraft] = useState(formatted);
  const [synced, setSynced] = useState(formatted);
  const [error, setError] = useState<string | null>(null);

  if (formatted !== synced) {
    setSynced(formatted);
    setDraft(formatted);
  }

  const commit = () => {
    const parsed = Number(draft);
    if (draft.trim() === "" || !Number.isFinite(parsed)) {
      setError(`${spec.label} must be a finite number. The previous value was kept.`);
      setDraft(value.toFixed(spec.decimals));
      return;
    }
    if (parsed < spec.min || parsed > spec.max) {
      setError(`${spec.label} must stay between ${spec.min} and ${spec.max} ${spec.unit}. ${parsed} was not applied.`);
      setDraft(value.toFixed(spec.decimals));
      return;
    }
    setError(null);
    onChange(parsed);
  };

  return (
    <div className="py-3.5">
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={rangeId} className="flex items-baseline gap-2">
          <ParameterSymbol symbol={spec.symbol} className="font-display text-[22px] leading-none" />
          <span className="text-[15px]">{spec.label}</span>
        </label>
        <span className="flex items-baseline gap-1">
          <input
            className="w-[4.6rem] border-b border-ink bg-transparent px-1 pb-0.5 text-right font-mono text-[14px] tabular-nums outline-none focus:bg-paper-2"
            inputMode="decimal"
            aria-label={`${spec.label} value in ${spec.unit}`}
            aria-describedby={error ? errorId : undefined}
            aria-invalid={error ? true : undefined}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
          <span className="w-7 font-mono text-[11px] text-graphite">{spec.unit}</span>
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
        onChange={(event) => {
          setError(null);
          onChange(Number(event.target.value));
        }}
      />
      <div className="mt-0.5 flex justify-between font-mono text-[10px] text-faint tabular-nums" aria-hidden="true">
        <span>{spec.min}</span>
        <span>{spec.max}</span>
      </div>
      <p id={`${rangeId}-help`} className="mt-1 text-[13px] leading-snug text-graphite">
        {spec.explanation}
      </p>
      {error ? (
        <p id={errorId} className="mt-2 border-l-2 border-ink pl-2 text-[13px] text-ink" role="status">
          {error}
        </p>
      ) : null}
    </div>
  );
}
