import type { ReactNode } from "react";

function Equation({ children }: { children: ReactNode }) {
  return <p className="my-2 font-display text-[22px] leading-snug italic sm:text-[24px]">{children}</p>;
}

const S = ({ children }: { children: ReactNode }) => (
  <sub className="text-[0.6em] not-italic">{children}</sub>
);

export function ModelExplanation() {
  const items: Array<{ title: string; body: ReactNode }> = [
    {
      title: "Passive membrane",
      body: (
        <>
          The voltage is pushed up by the input current and, at the same time, leaks back toward its resting value. Between spikes the voltage follows
          <Equation>
            τ<S>m</S> dV/dt = −(V − V<S>rest</S>) + R<S>m</S> I
          </Equation>
          With constant current the steady state is V∞ = Vrest + Rm I. Megaohms times nanoamps gives
          millivolts.
        </>
      ),
    },
    {
      title: "Exact step",
      body: (
        <>
          Each 0.1 ms step uses
          <Equation>V(t+Δt) = V∞ + (V − V∞) e<sup className="text-[0.6em]">−Δt/τm</sup></Equation>
          The time step never changes when you move a slider.
        </>
      ),
    },
    {
      title: "Threshold",
      body: "When the voltage reaches the threshold line, the neuron fires. If the updated voltage reaches Vth, the simulator records that time as a spike.",
    },
    {
      title: "Reset and refractory period",
      body: "Voltage is set back to Vrest, which is the reset potential in this lab. The voltage then stays at rest for the refractory period (tref), and another spike cannot occur. In a real neuron this pause comes from ion channels that need time to recover. A refractory period of 0 ms is allowed, and the neuron can then fire again on the very next step.",
    },
    {
      title: "Firing rate",
      body: "It is measured in spikes per second (spike count divided by the duration in seconds). The whole window counts, including the wait before the first spike.",
    },
    {
      title: "Firing-rate curve",
      body: "The simulator runs the whole neuron again for each current from 0 to 10 nA in steps of 0.5 nA, and each result becomes one point. It is a set of real results, not a formula fitted to the data.",
    },
    {
      title: "Minimum current to fire",
      body: "A binary search for the smallest current, to 0.01 nA, inside 0–10 nA that produces at least one spike before the recording ends. It can exceed the steady-state rheobase (Vth − Vrest) / Rm, because a finite window may end before the membrane arrives. If 10 nA never fires, the value is unavailable.",
    },
  ];

  return (
    <section id="how-it-works" className="scroll-mt-24" aria-labelledby="model-heading">
      <div className="rule" aria-hidden="true" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(240px,340px)_1fr]">
        <div>
          <p className="eyebrow">Appendix</p>
          <h2 id="model-heading" className="mt-2 font-display text-[40px] leading-[0.95]">
            How this model <span className="italic">works.</span>
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
            SpikeLab integrates a deterministic leaky integrate-and-fire neuron in your browser. It
            is a teaching model of threshold and reset, not a biophysical membrane.
          </p>
          <p className="hand mt-4 text-[20px] leading-snug text-ink-2">
            real neurons add voltage-gated conductances, synapses, shape and noise — none of which
            are here
          </p>
                    <h3 className="mt-8 font-display text-[26px] leading-tight">
            The model in <span className="italic">four steps.</span>
          </h3>
          <ul className="mt-4 grid gap-y-4">
            <li className="grid grid-cols-[1.6rem_1fr] gap-x-2">
              <span className="font-display text-[18px] italic text-graphite">★</span>
              <p className="text-[14.5px] leading-relaxed text-ink-2">
                <strong className="font-medium text-ink">Integrate:</strong> The neuron has an
                internal voltage (that&apos;s the membrane potential), and when it receives
                electrical inputs from other neurons, it adds them together, causing its internal
                voltage to rise.
              </p>
            </li>
            <li className="grid grid-cols-[1.6rem_1fr] gap-x-2">
              <span className="font-display text-[18px] italic text-graphite">★</span>
              <p className="text-[14.5px] leading-relaxed text-ink-2">
                <strong className="font-medium text-ink">Leak:</strong> If no new inputs arrive,
                the voltage decays and drifts back down toward its baseline resting level over
                time.
              </p>
            </li>
            <li className="grid grid-cols-[1.6rem_1fr] gap-x-2">
              <span className="font-display text-[18px] italic text-graphite">★</span>
              <p className="text-[14.5px] leading-relaxed text-ink-2">
                <strong className="font-medium text-ink">Fire:</strong> If the inputs arrive fast
                enough to push the voltage beyond a specific limit (the threshold), then the neuron
                fires a single electrical output pulse (a spike).
              </p>
            </li>
            <li className="grid grid-cols-[1.6rem_1fr] gap-x-2">
              <span className="font-display text-[18px] italic text-graphite">★</span>
              <p className="text-[14.5px] leading-relaxed text-ink-2">
                <strong className="font-medium text-ink">Reset:</strong> Immediately after firing,
                its voltage drops back down to a low baseline value (the reset potential) and the
                process repeats.
              </p>
            </li>
          </ul>
        </div>
        <ol className="grid gap-x-10 gap-y-6 md:grid-cols-2">
          {items.map((item, index) => (
            <li key={item.title} className="grid grid-cols-[1.6rem_1fr] gap-x-2">
              <span className="font-display text-[18px] italic text-graphite">{index + 1}.</span>
              <div>
                <h3 className="text-[16px] font-medium">{item.title}</h3>
                <div className="mt-1 text-[14.5px] leading-relaxed text-ink-2">{item.body}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <p className="mt-8 max-w-3xl text-[14px] leading-relaxed text-graphite">
        The open circles on the voltage plot are spike times, not the shape of a biological action
        potential. A standard reference for the equation is the free textbook{" "}
        <a
          className="ink-link ink-link-static text-ink"
          href="https://neuronaldynamics.epfl.ch/online/Ch1.S3.html"
          target="_blank"
          rel="noreferrer"
        >
          Neuronal Dynamics, chapter 1.3
        </a>
        .
      </p>
    </section>
  );
}
