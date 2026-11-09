# ➴SpikeLab

An interactive neuron simulator with two models side by side: **leaky integrate-and-fire** and **Hodgkin-Huxley**. Change a neuron's settings, watch the voltage respond, and see what each model includes and what it leaves out. Everything runs in the browser.

## Live demo

**[Open SpikeLab](https://spikelab-i11.vercel.app)**


<!-- To add a screenshot: save an image as docs/screenshot.png in this repository, then delete this line and the line below this one, and use: ![SpikeLab simulation lab](docs/screenshot.png) -->

## What it is

SpikeLab has two parts.

1. **A scrolling landing page.** A single procedurally drawn neuron is followed from the whole cell into the soma and axon hillock, then turns upright beside the parameters used in the lab.
2. **A simulation lab.** A switch at the top chooses the model. Each model has its own controls, charts and a written appendix.

## Features

**Leaky integrate-and-fire view**

- Seven sliders: input current, resting potential, firing threshold, membrane time constant, membrane resistance, refractory period and simulation time
- Voltage trace with spike times marked
- Firing-rate curve across input currents
- Spike count, firing rate and the minimum current needed to fire, all calculated from the same run
- A short note on each result, an explanation of every setting, and experiments to try

**Hodgkin-Huxley view**

- A stimulus current and duration, with three presets: subthreshold, single spike and repeated firing
- Membrane voltage with the stimulus period shaded
- The sodium and potassium gating variables (m, h and n), so you can see which channel does what during a spike
- Spike count, peak voltage and the charge delivered
- Its own appendix with the equations, a step-by-step account of one spike, a comparison with the simple model and the limitations

**Both**

- Every view comes with a section on what that model leaves out
- No server, database or account is needed, because the simulations run in the browser

## The two models

**Leaky integrate-and-fire.** Below threshold the membrane voltage follows

```
tau_m * dV/dt = -(V - V_rest) + R_m * I
```

At each fixed 0.1 ms step the voltage is updated with the exact solution for a constant current. A spike is recorded when the voltage reaches threshold, then the voltage resets to the resting potential and is held there for the refractory period. Firing rate is the spike count divided by the full duration in seconds. The minimum current to fire is found by a binary search, to 0.01 nA, over 0 to 10 nA. It can be higher than the steady-state rheobase, (V_threshold - V_rest) / R_m, because the recording has a finite length.

**Hodgkin-Huxley.** The squid giant axon model, with rest near -65 mV:

```
C_m * dV/dt = I - g_Na * m^3 * h * (V - E_Na) - g_K * n^4 * (V - E_K) - g_L * (V - E_L)
dx/dt = alpha_x(V) * (1 - x) - beta_x(V) * x      for x = m, h, n
```

The equations are integrated with the Euler method at 0.01 ms for 60 ms. A spike is counted when the voltage crosses 0 mV going up, and the detector re-arms once the voltage falls below -20 mV. Parameter values: g_Na = 120, g_K = 36, g_L = 0.3 mS/cm2; E_Na = +50, E_K = -77, E_L = -54.387 mV; C_m = 1 uF/cm2.

| | Leaky integrate-and-fire | Hodgkin-Huxley |
|---|---|---|
| Spike shape | A marker only | Calculated: upstroke, peak, undershoot |
| Ion channels | None | Sodium, potassium and leak |
| Refractory period | A number you set | Comes from the gates h and n |
| Equations | One | Four |
| Speed | Very fast | Slower |
| Good for | Networks and the basic idea | How ion channels make a spike |

## Built with

- Next.js (App Router), React and TypeScript
- Tailwind CSS
- Motion, for page and scroll animation
- Three.js, React Three Fiber and Drei, for the 3D neuron
- Recharts, for the charts

## Run it on your own computer

You need Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The simulation lab is at `http://localhost:3000/simulator`.

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Make a production build |
| `npm start` | Run the production build |
| `npm test` | Run the tests |
| `npm run typecheck` | Check the TypeScript |
| `npm run lint` | Check the code style |

The tests cover the leaky integrate-and-fire model and the parameter checks.

## Project structure

| Folder or file | What is in it |
|---|---|
| `app/` | The pages (`page.tsx` for the landing page, `simulator/page.tsx` for the lab), global styles and the site icon |
| `components/hero/`, `components/sections/`, `components/home/` | The landing page: hero, scrolling story and parameter notes |
| `components/neuron/` | The 3D neuron: drawing, ink shader, camera, labels and the fallback when WebGL is unavailable |
| `components/simulator/` | The lab: charts, controls, result cards and the appendix for each model |
| `components/navigation/`, `components/ui/` | Top bar, footer, logo, buttons and shared pieces |
| `hooks/` | React hooks for the simulation, screen size and reduced motion |
| `lib/neuron-model.ts` | The leaky integrate-and-fire simulation |
| `lib/hodgkin-huxley.ts` | The Hodgkin-Huxley simulation, presets and slider ranges |
| `lib/` (other files) | Firing rate, parameter limits and checks, presets and colours |
| `tests/` | Tests for the neuron model and the parameter checks |

The two lab views are `components/simulator/SimulatorDashboard.tsx` (the leaky view and the model switch) and `components/simulator/HodgkinHuxleyLab.tsx`. Their appendices are `ModelExplanation.tsx` and `HodgkinHuxleyExplanation.tsx`.

## Design

The whole site is drawn in one ink on one paper, like a scientific plate. The paper is a soft pink, set in `app/globals.css` and `lib/palette.ts`, and the two files must always use the same value, because the 3D scene and the charts read the colour from `palette.ts`. The neuron is rendered by a custom engraving shader (`components/neuron/ink-materials.ts`), and interface outlines get a slightly unsteady pen from shared SVG filters (`components/ui/InkFilters.tsx`). Chart data lines are left exact, and only the axes and grid are wobbled.

## Deploying to Vercel

This is a standard Next.js project. Import the GitHub repository into Vercel, set the **Framework Preset** to **Next.js**, and leave the build command and output directory on their defaults. No environment variables, database or Python service is needed.

## Limitations

- The 3D neuron is a procedural drawing. It is not a reconstruction of a real cell and is not to scale.
- **Leaky integrate-and-fire:** no ion channels, no spike shape, a fixed threshold, a reset locked to the resting potential, a refractory period that is a number you choose, a single point with no shape, no synapses, no noise and no adaptation.
- **Hodgkin-Huxley:** one small patch of squid axon at about 6 degrees C, not a human neuron. Only sodium, potassium and leak currents are included. There are no dendrites, no travelling signal, no synapses and no noise, and each gate is treated as an independent switch.
- The Hodgkin-Huxley simulation has no automated tests yet.

## References

- Hodgkin AL, Huxley AF (1952). A quantitative description of membrane current and its application to conduction and excitation in nerve. *Journal of Physiology* 117, 500-544.
- Gerstner W, Kistler WM, Naud R, Paninski L (2014). *Neuronal Dynamics*. Cambridge University Press. Free online at https://neuronaldynamics.epfl.ch

## Author

Ishita 

[Optional: add a line about how the project was built, for example that it was built with help from Claude.]
