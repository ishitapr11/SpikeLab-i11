export function MetricCard({
  label,
  value,
  unit,
  detail,
}: {
  label: string;
  value: string;
  unit?: string;
  detail: string;
}) {
  return (
    <article className="px-0 py-4 sm:px-5 sm:first:pl-0">
      <h2 className="eyebrow">{label}</h2>
      <p className="mt-2 font-display text-[44px] leading-none tracking-[-0.01em] tabular-nums">
        {value}
        {unit ? <span className="ml-2 font-mono text-[13px] tracking-normal text-graphite">{unit}</span> : null}
      </p>
      <p className="mt-2 text-[13.5px] leading-snug text-ink-2">{detail}</p>
    </article>
  );
}
