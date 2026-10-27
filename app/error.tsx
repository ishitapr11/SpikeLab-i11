"use client";

import { buttonClass } from "@/components/ui/Button";

export default function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
      <p className="eyebrow">SpikeLab</p>
      <h1 className="mt-3 font-display text-5xl">This view failed to load.</h1>
      <p className="mt-3 text-[15px] text-ink-2">
        Try the page again. The neuron simulation runs locally and does not need an account.
      </p>
      <button type="button" className={buttonClass("solid", "mt-6 w-fit")} onClick={reset}>
        Try again
      </button>
    </main>
  );
}
