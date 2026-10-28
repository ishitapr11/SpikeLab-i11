# SpikeLab

SpikeLab is an interactive exhibit and a leaky integrate-and-fire simulator. The landing page scrolls a single procedurally drawn neuron from a full view into the soma and axon hillock, then turns it upright beside the parameters used in the lab. The simulation runs entirely in the browser.

## What you can do

- Scroll the landing page to follow the neuron from the whole cell into the soma and axon hillock.
- Open the simulation lab and change the injected current and the membrane parameters.
- Read the voltage trace, with spike times marked on it.
- See the firing rate against input current.
- Read the spike count, time to first spike, firing rate and minimum current to fire, all calculated from the same simulation run.

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
## Project structure

| Folder | What is in it |
|---|---|
| `app/` | The pages (`page.tsx` for the landing page, `simulator/page.tsx` for the lab), global styles and the site icon |
| `components/` | The interface: hero, 3D neuron, simulator charts and controls, navigation and shared parts |
| `hooks/` | React hooks for the simulation, screen size and reduced motion |
| `lib/` | The model and the data: neuron model, firing rate, parameter limits and checks, colours |
| `tests/` | Tests for the neuron model and the parameter checks |

## The model

This is a leaky integrate-and-fire neuron. Below threshold, the membrane voltage follows

τm dV/dt = −(V − Vrest) + Rm I

with the exact constant-current step

V(t+Δt) = V∞ + (V − V∞) exp(−Δt / τm), V∞ = Vrest + Rm I.

The fixed step is 0.1 ms. A spike is recorded when voltage reaches threshold. Voltage then resets to the resting potential. The refractory period is measured from that spike time and holds the voltage at rest. Firing rate is the spike count divided by the full simulation duration in seconds.

Minimum current to fire is found with a binary search, to 0.01 nA, for the smallest current between 0 and 10 nA that produces at least one spike before the recording ends. It is not the same number as the steady-state rheobase, (V_threshold - V_rest) / R_m. If 10 nA produces no spike, the metric is shown as unavailable.

-The time step is a fixed 0.1 ms.
-A spike is recorded when the voltage reaches threshold. The voltage then resets to the resting potential.
-The refractory period is measured from the spike time and holds the voltage at rest.
-Firing rate is the spike count divided by the full simulation duration in seconds.

## Deployment

The app is a standard Next.js project and can be imported into Vercel with no environment variables, database, or Python service. Use the framework preset, leave the build command as `npm run build`, and leave the output as the Next.js default.

## Limitations

- The 3D neuron is a procedural drawing, not a reconstruction and not to scale.
- The black band along the axon is a diagram of where the impulse is (continuous on the initial segment, jumping node to node under myelin). It is not a charge distribution.
- The simulator has no synapses, noise, adaptation, or voltage-gated conductances.
- Reset potential is locked to rest and is not its own slider.
