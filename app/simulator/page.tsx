import type { Metadata } from "next";
import { SimulatorDashboard } from "@/components/simulator/SimulatorDashboard";

export const metadata: Metadata = {
  title: "Simulation Lab",
  description:
    "Run a leaky integrate-and-fire neuron in the browser. Change current, threshold, membrane properties, and refractory period, then read the voltage trace and firing-rate curve.",
};

export default function SimulatorPage() {
  return <SimulatorDashboard />;
}
