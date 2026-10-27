import Link from "next/link";
import { Wordmark } from "@/components/navigation/Wordmark";

export function Footer() {
  return (
    <footer className="px-4 pt-6 pb-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1360px]">
        <div className="rule" aria-hidden="true" />
        <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Wordmark />
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-ink-2">
              A procedurally drawn neuron and a deterministic leaky integrate-and-fire model. The
              drawing is not to scale, and the simulator does not describe any particular cell.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-[15px] md:items-end">
            <Link href="/simulator" className="ink-link">
              Open the simulation lab
            </Link>
            <a
              className="ink-link"
              href="https://neuronaldynamics.epfl.ch/online/Ch1.S3.html"
              target="_blank"
              rel="noreferrer"
            >
              Neuronal Dynamics, chapter 1.3 ↗
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
