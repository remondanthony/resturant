/**
 * Generates the TAVOLO placeholder plates in /public/images.
 *
 * These are intentional, designed stand-ins for editorial photography — warm
 * espresso washes with a single key light, film grain and a faint hairline
 * motif — not stock imagery. Re-run with `node scripts/generate-placeholders.mjs`
 * after changing the palette; delete a file here once real photography lands.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "public", "images");

const INK = { top: "#1b1610", bottom: "#080605" };
const AMBER = "#e8a34a";
const COPPER = "#b4622c";
const CREAM = "#f2eada";

/** Hairline motifs, drawn in a 0–100 square and stretched to the frame. */
const motifs = {
  plate: `<circle cx="50" cy="52" r="30"/><circle cx="50" cy="52" r="21"/>`,
  arch: `<path d="M26 96V44a24 24 0 0 1 48 0v52"/><path d="M14 96h72"/>`,
  horizon: `<path d="M8 68h84"/><circle cx="76" cy="34" r="9"/>`,
  column: `<path d="M50 6v88"/><path d="M30 26h40"/><path d="M30 74h40"/>`,
  frame: `<rect x="18" y="14" width="64" height="72"/>`,
  fold: `<path d="M6 84 44 26l22 34 26-22"/>`,
  ring: `<circle cx="50" cy="50" r="34"/><path d="M50 16v68"/>`,
  glass: `<path d="M36 14h28l-4 26a10 10 0 0 1-20 0z"/><path d="M50 40v34"/><path d="M36 78h28"/>`,
  panes: `<rect x="20" y="16" width="60" height="68"/><path d="M50 16v68"/><path d="M20 50h60"/>`,
  sweep: `<path d="M6 76c26-44 62-44 88 0"/><path d="M6 90h88"/>`,
  cloche: `<path d="M22 66a28 28 0 0 1 56 0z"/><path d="M14 72h72"/><circle cx="50" cy="34" r="3"/>`,
  table: `<path d="M12 46h76"/><path d="M22 46v40"/><path d="M78 46v40"/><circle cx="50" cy="30" r="8"/>`,
};

function plate({
  w,
  h,
  key = [0.72, 0.18],
  rim = [0.06, 0.94],
  motif = "plate",
  intensity = 1,
  lift = INK.top,
  motifOpacity = 0.07,
  motifTransform = "",
}) {
  const [kx, ky] = key;
  const [rx, ry] = rim;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="base" x1="0.15" y1="0" x2="0.7" y2="1">
      <stop offset="0" stop-color="${lift}"/>
      <stop offset="1" stop-color="${INK.bottom}"/>
    </linearGradient>
    <radialGradient id="key" cx="${kx}" cy="${ky}" r="0.85">
      <stop offset="0" stop-color="${AMBER}" stop-opacity="${(0.3 * intensity).toFixed(3)}"/>
      <stop offset="0.38" stop-color="${COPPER}" stop-opacity="${(0.13 * intensity).toFixed(3)}"/>
      <stop offset="1" stop-color="${COPPER}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="rim" cx="${rx}" cy="${ry}" r="0.7">
      <stop offset="0" stop-color="${COPPER}" stop-opacity="${(0.14 * intensity).toFixed(3)}"/>
      <stop offset="1" stop-color="${COPPER}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.45" r="0.78">
      <stop offset="0.5" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.6"/>
    </radialGradient>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#base)"/>
  <rect width="${w}" height="${h}" fill="url(#key)"/>
  <rect width="${w}" height="${h}" fill="url(#rim)"/>
  <g transform="scale(${w / 100} ${h / 100})${motifTransform ? ` ${motifTransform}` : ""}" fill="none" stroke="${CREAM}" stroke-width="1" opacity="${motifOpacity}" vector-effect="non-scaling-stroke">${motifs[motif]}</g>
  <rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.14" style="mix-blend-mode:overlay"/>
  <rect width="${w}" height="${h}" fill="url(#vignette)"/>
</svg>
`;
}

const files = {
  "hero.svg": { w: 1920, h: 1080, key: [0.68, 0.2], rim: [0.05, 0.9], motif: "horizon", intensity: 1.9, lift: "#2a221a", motifOpacity: 0.05 },
  "about.svg": { w: 1200, h: 1500, key: [0.28, 0.22], rim: [0.9, 0.85], motif: "arch", intensity: 1.7, lift: "#2a2119", motifOpacity: 0.06 },
  "private-dining.svg": { w: 1920, h: 1120, key: [0.66, 0.44], rim: [0.14, 0.88], motif: "column", intensity: 2.6, lift: "#3a2d1f", motifOpacity: 0.055 },
  "experience.svg": { w: 1000, h: 1400, key: [0.75, 0.28], rim: [0.1, 0.88], motif: "ring", intensity: 1.5, lift: "#271f18", motifOpacity: 0.05 },
  "dish-tagliatelle.svg": { w: 1000, h: 1250, key: [0.62, 0.24], rim: [0.1, 0.9], motif: "plate", intensity: 1.8, lift: "#2d241a", motifOpacity: 0.05, motifTransform: "translate(-6 4) scale(1.12)" },
  "dish-branzino.svg": { w: 1000, h: 1250, key: [0.34, 0.2], rim: [0.88, 0.86], motif: "plate", intensity: 1.7, lift: "#291f18", motifOpacity: 0.045, motifTransform: "translate(10 -6) scale(0.82)" },
  "dish-risotto.svg": { w: 1000, h: 1250, key: [0.5, 0.3], rim: [0.08, 0.92], motif: "plate", intensity: 1.9, lift: "#302619", motifOpacity: 0.05, motifTransform: "translate(-14 -10) scale(0.95)" },
  "dish-agnolotti.svg": { w: 1000, h: 1250, key: [0.78, 0.16], rim: [0.14, 0.94], motif: "plate", intensity: 1.7, lift: "#2b2119", motifOpacity: 0.045, motifTransform: "translate(6 12) scale(1.24)" },
  "gallery-01.svg": { w: 1400, h: 900, key: [0.7, 0.24], rim: [0.08, 0.9], motif: "horizon", intensity: 1.6, lift: "#2a2119", motifOpacity: 0.05 },
  "gallery-02.svg": { w: 1000, h: 900, key: [0.3, 0.18], rim: [0.9, 0.9], motif: "frame", intensity: 1.5, lift: "#262019", motifOpacity: 0.05 },
  "gallery-03.svg": { w: 1000, h: 1000, key: [0.55, 0.3], rim: [0.1, 0.85], motif: "plate", intensity: 1.7, lift: "#2e2419", motifOpacity: 0.05 },
  "gallery-04.svg": { w: 1000, h: 1000, key: [0.72, 0.26], rim: [0.06, 0.92], motif: "arch", intensity: 1.55, lift: "#282018", motifOpacity: 0.05 },
  "gallery-05.svg": { w: 1000, h: 1000, key: [0.4, 0.22], rim: [0.92, 0.88], motif: "ring", intensity: 1.6, lift: "#2b2219", motifOpacity: 0.045 },
  "og.svg": { w: 1200, h: 630, key: [0.68, 0.22], rim: [0.06, 0.9], motif: "horizon", intensity: 1.9, lift: "#2a221a", motifOpacity: 0.05 },

  /* — Phase 2: page heroes ————————————————————————————————— */
  "hero-menu.svg": { w: 1920, h: 900, key: [0.6, 0.26], rim: [0.08, 0.9], motif: "cloche", intensity: 1.8, lift: "#2c2419" },
  "hero-about.svg": { w: 1920, h: 1000, key: [0.34, 0.24], rim: [0.9, 0.86], motif: "table", intensity: 1.75, lift: "#2b2219" },
  "hero-gallery.svg": { w: 1920, h: 900, key: [0.72, 0.2], rim: [0.06, 0.92], motif: "panes", intensity: 1.7, lift: "#2a2119" },
  "hero-private-dining.svg": { w: 1920, h: 1000, key: [0.55, 0.28], rim: [0.12, 0.9], motif: "column", intensity: 2.1, lift: "#33281c" },
  "hero-contact.svg": { w: 1920, h: 820, key: [0.68, 0.3], rim: [0.1, 0.88], motif: "horizon", intensity: 1.7, lift: "#292018" },
  "hero-reservations.svg": { w: 1920, h: 900, key: [0.45, 0.22], rim: [0.88, 0.9], motif: "glass", intensity: 1.85, lift: "#2d2419" },

  /* — Phase 2: editorial plates ————————————————————————————— */
  "kitchen.svg": { w: 1000, h: 1250, key: [0.66, 0.22], rim: [0.1, 0.9], motif: "cloche", intensity: 1.75, lift: "#2d241a" },
  "approach.svg": { w: 1000, h: 1250, key: [0.32, 0.26], rim: [0.9, 0.88], motif: "sweep", intensity: 1.6, lift: "#2a2119" },
  "hospitality.svg": { w: 1400, h: 900, key: [0.6, 0.3], rim: [0.08, 0.9], motif: "table", intensity: 1.7, lift: "#2c2319" },
  "private-room.svg": { w: 1400, h: 900, key: [0.68, 0.26], rim: [0.1, 0.9], motif: "panes", intensity: 1.75, lift: "#2c2319" },
  "private-table.svg": { w: 1000, h: 1250, key: [0.4, 0.24], rim: [0.88, 0.88], motif: "glass", intensity: 1.7, lift: "#2b2219" },

  /* — Phase 2: gallery ————————————————————————————————————— */
  "gallery-06.svg": { w: 1400, h: 900, key: [0.34, 0.22], rim: [0.9, 0.88], motif: "sweep", intensity: 1.6, lift: "#2a2119", motifOpacity: 0.05 },
  "gallery-07.svg": { w: 1000, h: 1250, key: [0.68, 0.28], rim: [0.08, 0.9], motif: "glass", intensity: 1.65, lift: "#2c2319", motifOpacity: 0.05 },
  "gallery-08.svg": { w: 1000, h: 1000, key: [0.5, 0.2], rim: [0.9, 0.9], motif: "cloche", intensity: 1.6, lift: "#282018", motifOpacity: 0.05 },
  "gallery-09.svg": { w: 1400, h: 900, key: [0.62, 0.3], rim: [0.1, 0.86], motif: "table", intensity: 1.7, lift: "#2b2219", motifOpacity: 0.05 },
  "gallery-10.svg": { w: 1000, h: 1250, key: [0.3, 0.24], rim: [0.92, 0.86], motif: "arch", intensity: 1.6, lift: "#292018", motifOpacity: 0.05 },
  "gallery-11.svg": { w: 1000, h: 1000, key: [0.7, 0.24], rim: [0.06, 0.9], motif: "plate", intensity: 1.7, lift: "#2e2419", motifOpacity: 0.05 },
  "gallery-12.svg": { w: 1400, h: 900, key: [0.45, 0.26], rim: [0.9, 0.88], motif: "panes", intensity: 1.6, lift: "#2a2119", motifOpacity: 0.05 },
  "gallery-13.svg": { w: 1000, h: 1250, key: [0.6, 0.2], rim: [0.1, 0.92], motif: "column", intensity: 1.65, lift: "#2b2219", motifOpacity: 0.05 },
  "gallery-14.svg": { w: 1000, h: 1000, key: [0.38, 0.3], rim: [0.88, 0.84], motif: "ring", intensity: 1.6, lift: "#2c2319", motifOpacity: 0.05 },
};

await mkdir(OUT, { recursive: true });
for (const [name, spec] of Object.entries(files)) {
  await writeFile(resolve(OUT, name), plate(spec), "utf8");
}
console.log(`Wrote ${Object.keys(files).length} placeholder plates to public/images`);
