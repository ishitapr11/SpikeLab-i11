import Link from "next/link";
import { ANATOMY, ANATOMY_IDS } from "@/lib/anatomy";
import { buttonClass } from "@/components/ui/Button";

export function WebGLFallback() {
  return (
    <div className="flex h-full flex-col justify-end p-5 pt-20 lg:p-10">
      <p className="eyebrow">3D drawing unavailable</p>
      <h2 className="mt-2 max-w-md font-display text-3xl">The neuron needs WebGL to be drawn.</h2>
      <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-ink-2">
        This browser could not start a WebGL scene. The descriptions below still apply, and the
        simulation itself does not need 3D graphics.
      </p>
      <dl className="mt-4 grid max-w-xl gap-1.5 text-[15px]">
        {ANATOMY_IDS.map((id) => (
          <div key={id}>
            <dt className="inline font-display italic">{ANATOMY[id].label}. </dt>
            <dd className="inline text-ink-2">{ANATOMY[id].summary}</dd>
          </div>
        ))}
      </dl>
      <Link href="/simulator" className={buttonClass("solid", "mt-5 w-fit")}>
        Enter Simulation
      </Link>
    </div>
  );
}

export function ScenePlaceholder() {
  return (
    <div className="flex h-full items-center justify-center" aria-hidden="true">
      <p className="hand text-2xl text-graphite">inking the neuron…</p>
    </div>
  );
}
