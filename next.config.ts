import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The floating dev badge sat on top of the neuron's view controls.
  devIndicators: false,
};

export default nextConfig;
