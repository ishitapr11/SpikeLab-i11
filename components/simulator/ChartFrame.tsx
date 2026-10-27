import type { ReactNode } from "react";

/** A plate-style heading for one figure: number, title, a short note, then the drawing. */
export function ChartFrame({
  id,
  figure,
  title,
  note,
  actions,
  children,
}: {
  id: string;
  figure: string;
  title: string;
  note: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="max-w-2xl">
          <p className="eyebrow">{figure}</p>
          <h2 id={id} className="mt-1 font-display text-[30px] leading-none">
            {title}
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{note}</p>
        </div>
        {actions}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ChartTooltipBox({ children }: { children: ReactNode }) {
  return <div className="sketch bg-paper px-3 py-2 text-[12px] shadow-[3px_3px_0_rgba(25,24,20,0.12)]">{children}</div>;
}
