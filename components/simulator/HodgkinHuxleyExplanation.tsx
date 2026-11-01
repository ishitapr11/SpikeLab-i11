import type { ReactNode } from "react";

function Equation({ children }: { children: ReactNode }) {
  return <p className="my-2 font-display text-[21px] leading-snug italic sm:text-[23px]">{children}</p>;
}

const S = ({ children }: { children: ReactNode }) => (
  <sub className="text-[0.6em] not-italic">{children}</sub>
);

const SPIKE_STEPS: string[] = [
  "The stimulus pushes the voltage up a little.",
  "The m gates open fast, sodium rushes in, and the voltage rises even faster. This feedback is the sharp upstroke.",
  "The voltage peaks near +40 mV, close to the sodium reversal potential.",
  "Slower, the h gates close, which stops the sodium, and the n gates open, which lets potassium flow out.",
  "The voltage falls and dips below rest, because potassium is still open.",
  "The gates drift back to their resting values and the neuron is ready again.",
];

const EXPERIMENTS: Array<{ title: string; body: string }> = [
  {
    title: "A bump with no spike",
    body: "Choose the Subthreshold preset. The voltage rises a few millivolts and levels off, and the gates barely move.",
  },
  {
    title: "One spike",
    body: "Choose Single spike. Watch the gates in order: m jumps first, then h falls and n rises as the voltage comes back down.",
  },
  {
    title: "Repeated firing",
    body: "Choose Repeated firing. A long stimulus makes the neuron fire about three times in 40 ms.",
  },
  {
    title: "Find the threshold",
    body: "Keep the duration at 40 ms and raise the current slowly. Somewhere between 1.5 and 2.5 the neuron starts to fire.",
  },
  {
    title: "Charge is not the whole story",
    body: "10 for 1 ms delivers 10 nC/cm² and fires a spike. 1.5 for 40 ms delivers 60 nC/cm² and does not, because the leak and potassium currents work against a weak push the whole time.",
  },
];

const COMPARISON: Array<[string, string, string]> = [
  ["Spike shape", "A marker only", "Calculated: upstroke, peak, undershoot"],
  ["Ion channels", "None", "Sodium, potassium and leak"],
  ["Refractory period", "A number you set", "Comes from the gates h and n"],
  ["Equations", "One", "Four: voltage plus m, h and n"],
  ["Speed", "Very fast", "Slower"],
  ["Good for", "Networks and the basic idea", "How ion channels make a spike"],
];

export function HodgkinHuxleyExplanation() {
  const items: Array<{ title: string; plain: string; body: ReactNode }> = [
    {
      title: "The membrane as a circuit",
      plain:
        "The membrane stores charge like a capacitor, and ion channels let current through like adjustable resistors.",
      body: (
        <>
          The voltage changes according to
          <Equation>
            C<S>m</S> dV/dt = I − I<S>Na</S> − I<S>K</S> − I<S>L</S>
          </Equation>
          where I is the stimulus you apply and the other three are the channel currents. The
          membrane capacitance Cm is 1 µF/cm².
        </>
      ),
    },
    {
      title: "Three currents",
      plain:
        "Sodium pushes the voltage up, potassium pulls it down, and a small leak holds the rest.",
      body: (
        <>
          Each current is a conductance times a driving force:
          <Equation>
            I<S>Na</S> = g<S>Na</S> m³ h (V − E<S>Na</S>)
          </Equation>
          <Equation>
            I<S>K</S> = g<S>K</S> n⁴ (V − E<S>K</S>)
          </Equation>
          <Equation>
            I<S>L</S> = g<S>L</S> (V − E<S>L</S>)
          </Equation>
          Here gNa = 120, gK = 36 and gL = 0.3 mS/cm², and the reversal potentials are ENa = +50,
          EK = −77 and EL = −54.4 mV.
        </>
      ),
    },
    {
      title: "Gating variables",
      plain:
        "Each gate is a number from 0 (closed) to 1 (open) that moves toward a target set by the voltage.",
      body: (
        <>
          For each gate x (m, h or n)
          <Equation>
            dx/dt = α<S>x</S>(V) (1 − x) − β<S>x</S>(V) x
          </Equation>
          The m and n gates open as the voltage rises, and the h gate closes. The powers m³h and n⁴
          reflect how many gates must be open at once, and Hodgkin and Huxley found them by fitting
          their measurements.
        </>
      ),
    },
    {
      title: "One spike, step by step",
      plain:
        "A quick rush of sodium drives the voltage up, then sodium shuts off and potassium brings it back down.",
      body: (
        <ol className="mt-1 list-decimal space-y-1 pl-5">
          {SPIKE_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      ),
    },
    {
      title: "Where the refractory period comes from",
      plain:
        "Right after a spike the sodium gates are still closed and potassium is still open, so firing again is hard.",
      body: "For a few milliseconds h is low and n is high, so a second spike needs a much stronger push, or cannot happen at all. Nothing in this lab sets a refractory period. It appears by itself from the gates, unlike the slider in the simple model.",
    },
    {
      title: "How the lab solves it",
      plain:
        "The computer takes tiny steps of 0.01 ms and updates the voltage and the three gates at every step.",
      body: "The equations are integrated with the Euler method, a fixed step of 0.01 ms, for 60 ms in total. The stimulus switches on at 5 ms. A spike is counted when the voltage crosses 0 mV going up, and the detector re-arms once the voltage falls below −20 mV. One sample is stored every 0.1 ms for the charts.",
    },
    {
      title: "Charge delivered",
      plain:
        "A short pulse can trigger a spike if it delivers enough charge, but charge alone does not decide it.",
      body: "The card shows stimulus current times duration, in nC/cm². How the charge is delivered matters, because the leak and potassium currents act the whole time the stimulus is on.",
    },
  ];

  return (
    <section id="how-it-works" className="scroll-mt-24" aria-labelledby="hh-model-heading">
      <div className="rule" aria-hidden="true" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(240px,340px)_1fr]">
        <div>
          <p className="eyebrow">Appendix</p>
          <h2 id="hh-model-heading" className="mt-2 font-display text-[40px] leading-[0.95]">
            The Hodgkin-Huxley <span className="italic">model.</span>
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
            In 1952 Hodgkin and Huxley described the action potential of the squid giant axon with
            ion channels. Unlike the leaky integrate-and-fire model, the spike is calculated from
            sodium, potassium and leak currents, so it has a real shape.
          </p>
          <p className="hand mt-4 text-[20px] leading-snug text-ink-2">
            more realistic than the simple model, but still one patch of squid membrane
          </p>
        </div>
        <ol className="grid gap-x-10 gap-y-6 md:grid-cols-2">
          {items.map((item, index) => (
            <li key={item.title} className="grid grid-cols-[1.6rem_1fr] gap-x-2">
              <span className="font-display text-[18px] italic text-graphite">{index + 1}.</span>
              <div>
                <h3 className="text-[16px] font-medium">{item.title}</h3>
                <p className="mt-1 text-[14.5px] font-medium leading-relaxed text-ink">{item.plain}</p>
                <div className="mt-1 text-[14.5px] leading-relaxed text-ink-2">{item.body}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-12">
        <div className="rule" aria-hidden="true" />
        <h3 className="mt-6 font-display text-[28px] leading-tight">
          Compared with the <span className="italic">simple model.</span>
        </h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left text-[14.5px]">
            <thead>
              <tr className="border-b border-ink">
                <th scope="col" className="py-2 pr-4 font-medium">
                  <span className="sr-only">Property</span>
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Leaky integrate-and-fire
                </th>
                <th scope="col" className="py-2 font-medium">
                  Hodgkin-Huxley
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map(([property, simple, detailed]) => (
                <tr key={property} className="border-b border-rule align-top">
                  <th scope="row" className="py-2 pr-4 font-medium">
                    {property}
                  </th>
                  <td className="py-2 pr-4 text-ink-2">{simple}</td>
                  <td className="py-2 text-ink-2">{detailed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-12">
        <div className="rule" aria-hidden="true" />
        <h3 className="mt-6 font-display text-[28px] leading-tight">
          Try it <span className="italic">yourself.</span>
        </h3>
        <ul className="mt-5 grid gap-x-10 gap-y-5 md:grid-cols-2">
          {EXPERIMENTS.map((experiment, index) => (
            <li key={experiment.title} className="grid grid-cols-[1.6rem_1fr] gap-x-2">
              <span className="font-display text-[18px] italic text-graphite">{index + 1}.</span>
              <div>
                <h4 className="text-[16px] font-medium">{experiment.title}</h4>
                <p className="mt-1 text-[14.5px] leading-relaxed text-ink-2">{experiment.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-12">
        <div className="rule" aria-hidden="true" />
        <h3 className="mt-6 font-display text-[28px] leading-tight">
          What this model <span className="italic">leaves out.</span>
        </h3>
        <ul className="mt-4 max-w-3xl space-y-2 text-[14.5px] leading-relaxed text-ink-2">
          <li className="grid grid-cols-[1rem_1fr] gap-2">
            <span aria-hidden="true">–</span>
            <span>It describes one small patch of squid axon at about 6 °C, not a human neuron.</span>
          </li>
          <li className="grid grid-cols-[1rem_1fr] gap-2">
            <span aria-hidden="true">–</span>
            <span>Only three currents are included. Real neurons have many more, such as calcium currents.</span>
          </li>
          <li className="grid grid-cols-[1rem_1fr] gap-2">
            <span aria-hidden="true">–</span>
            <span>There are no dendrites, no travelling signal and no synapses. The input is a current step.</span>
          </li>
          <li className="grid grid-cols-[1rem_1fr] gap-2">
            <span aria-hidden="true">–</span>
            <span>There is no noise. Real ion channels open and close at random.</span>
          </li>
          <li className="grid grid-cols-[1rem_1fr] gap-2">
            <span aria-hidden="true">–</span>
            <span>Each gate acts as an independent switch, which is an approximation.</span>
          </li>
        </ul>
      </div>

      <p className="mt-8 max-w-3xl text-[14px] leading-relaxed text-graphite">
        Original paper: Hodgkin AL, Huxley AF (1952), A quantitative description of membrane current
        and its application to conduction and excitation in nerve, Journal of Physiology 117,
        500–544. The parameter values are the standard squid-axon set, with rest near −65 mV.
      </p>
    </section>
  );
}
