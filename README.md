# SpikeLab

SpikeLab is an interactive exhibit and a leaky integrate-and-fire simulator. The landing page scrolls a single procedurally drawn neuron from a full view into the soma and axon hillock, then turns it upright beside the parameters used in the lab. The simulation runs entirely in the browser.

## Look

The whole product is drawn in one ink on one paper, like a scientific plate. The neuron is rendered by a custom engraving shader (`components/neuron/ink-materials.ts`): tone is built from hatch lines that follow each process, cross-contour rings in shadow, and stipple on the soma, closed by a constant-width inverted-hull outline. The nucleus is drawn through the soma by casting the view ray in the cell's own coordinates. Interface outlines get their unsteady pen from shared SVG displacement filters (`components/ui/InkFilters.tsx`); chart data lines are left exact and only axes and grid are wobbled.

## Stack

- Next.js App Router, React, TypeScript
- Tailwind CSS
- Motion for page and scroll-linked interface animation
- Three.js, React Three Fiber, and Drei for the neuron
- Recharts for the voltage trace and firing-rate curve

## Scripts

```bash
npm install
npm run dev
npm test
npm run typecheck
npm run lint
npm run build
npm start
```

Open the dev server at `http://localhost:3000`. The simulator is at `/simulator`.

## Model

Subthreshold voltage uses

τm dV/dt = −(V − Vrest) + Rm I

with the exact constant-current step

V(t+Δt) = V∞ + (V − V∞) exp(−Δt / τm), V∞ = Vrest + Rm I.

The fixed step is 0.1 ms. A spike is recorded when voltage reaches threshold. Voltage then resets to the resting potential. The refractory period is measured from that spike time and holds the voltage at rest. Firing rate is the spike count divided by the full simulation duration in seconds.

Minimum current to fire is a binary search, to 0.01 nA, for the smallest current in 0–10 nA that produces at least one spike before the recording ends. It is not the same number as the steady-state rheobase (Vth − Vrest) / Rm. If 10 nA produces no spike, the metric is unavailable.

The open circles on the voltage plot are spike times. They are not a Hodgkin–Huxley waveform.

## Deployment

The app is a standard Next.js project and can be imported into Vercel with no environment variables, database, or Python service. Use the framework preset, leave the build command as `npm run build`, and leave the output as the Next.js default.

## Limitations

- The 3D neuron is a procedural drawing, not a reconstruction and not to scale.
- The black band along the axon is a diagram of where the impulse is (continuous on the initial segment, jumping node to node under myelin). It is not a charge distribution.
- The simulator has no synapses, noise, adaptation, or voltage-gated conductances.
- Reset potential is locked to rest and is not its own slider.
