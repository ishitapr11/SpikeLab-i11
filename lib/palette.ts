/**
 * The two inks used by WebGL and SVG drawings. They match the CSS tokens in app/globals.css
 * and are kept as raw sRGB triples so shaders write the exact page colours.
 */
export const INK_HEX = "#191814";
export const PAPER_HEX = "#f3efe4";
export const GRAPHITE_HEX = "#66625a";
export const RULE_HEX = "#cbc3b1";

function srgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

export const INK_RGB = srgb(INK_HEX);
export const PAPER_RGB = srgb(PAPER_HEX);

export const chartInk = {
  ink: INK_HEX,
  graphite: GRAPHITE_HEX,
  rule: RULE_HEX,
  paper: PAPER_HEX,
} as const;
