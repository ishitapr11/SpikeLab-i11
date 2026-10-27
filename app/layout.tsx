import type { Metadata, Viewport } from "next";
import { Caveat, IBM_Plex_Mono, Instrument_Serif, Newsreader } from "next/font/google";
import { MotionProvider } from "@/components/providers/MotionProvider";
import { InkFilters } from "@/components/ui/InkFilters";
import "./globals.css";

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const serif = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-newsreader",
  display: "swap",
});

const hand = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SpikeLab · Simulating Neuronal Firing",
    template: "%s · SpikeLab",
  },
  description:
    "Explore how neurons integrate electrical input and generate action potentials, then run a leaky integrate-and-fire simulation in the browser.",
  applicationName: "SpikeLab",
};

export const viewport: Viewport = {
  themeColor: "#f3efe4",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${serif.variable} ${hand.variable} ${mono.variable}`}
    >
      <body className="min-h-screen bg-paper text-ink antialiased">
        <InkFilters />
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
