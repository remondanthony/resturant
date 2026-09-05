export type GalleryItem = {
  src: string;
  alt: string;
  /** Tailwind classes controlling this frame's place in the editorial grid. */
  className: string;
  /** Extra classes on the image itself — usually an exposure lift. */
  imageClassName?: string;
  ratio: string;
};

/**
 * The photographs we have so far.
 *
 * Each is described once here so its alt text cannot drift between the
 * homepage preview and the gallery page; the entries below supply only the
 * frame — column span and aspect ratio. Slots still pointing at a
 * `gallery-*.svg` are placeholders waiting on a real photograph.
 */
const photo = {
  diningRoomDusk: {
    src: "/images/img1.png",
    alt: "A round table laid for six beside the window at dusk, hills and cypresses beyond the glass",
  },
  banquette: {
    src: "/images/img2.png",
    alt: "A curved velvet banquette around a marble table, lit by a single pendant",
  },
  placeSetting: {
    src: "/images/img3.png",
    alt: "A place setting on marble: bronze plate, folded napkin, glasses and a lit candle",
  },
  archway: {
    src: "/images/img4.png",
    alt: "The arched corridor from the entrance through to the dining room, an olive tree beside it",
  },
  wine: {
    src: "/images/img5.png",
    alt: "Two glasses of red wine on the table, the room behind them lit by candles",
  },
  bar: {
    src: "/images/img6.jpeg",
    alt: "A glass of wine poured for a guest at the bar, the cheese cabinet lit behind",
  },
  rollingPasta: {
    src: "/images/img7.jpeg",
    alt: "Hands rolling a sheet of pasta dough flat with a wooden pin",
  },
  thePass: {
    src: "/images/img8.jpeg",
    alt: "A chef spooning sauce over plates at the pass, under the heat lamps",
  },
  copperPan: {
    src: "/images/img9.jpeg",
    alt: "Risotto poured from a copper pan into a bowl at the stove",
  },
  finishing: {
    src: "/images/img10.jpeg",
    alt: "Two chefs finishing a row of plates under the heat lamps",
  },
  prepTray: {
    src: "/images/img11.jpeg",
    alt: "A cook laying filled pasta out on a tray in the store room",
  },
  sharedTable: {
    src: "/images/img12.jpeg",
    alt: "Looking down on a shared table mid-meal, hands reaching across plates by candlelight",
    // Portrait, and the frame it sits in is 3/2, so almost half the height is
    // cropped away. Centred keeps the fullest row of plates; give it a
    // portrait frame if the whole spread ever needs to be visible.
  },
  friendsEating: {
    src: "/images/img13.jpeg",
    alt: "Five friends eating pasta around a table in the vaulted room",
  },
  laidTable: {
    src: "/images/Experience.png",
    alt: "A long table laid for a group, candles and olive branches down its centre",
    // Shot appreciably darker than the others here — about half their mean
    // luminance — so it is lifted to sit alongside them rather than reading as
    // a muddy frame in the same row.
    imageClassName: "[filter:brightness(1.55)_contrast(0.93)_saturate(1.12)]",
  },
} as const;

/** The five frames shown on the homepage. */
export const galleryPreview: readonly GalleryItem[] = [
  { ...photo.diningRoomDusk, className: "sm:col-span-7", ratio: "14 / 9" },
  { ...photo.banquette, className: "sm:col-span-5 sm:translate-y-10", ratio: "10 / 9" },
  { ...photo.placeSetting, className: "sm:col-span-4", ratio: "1 / 1" },
  { ...photo.archway, className: "sm:col-span-4 sm:-translate-y-8", ratio: "1 / 1" },
  { ...photo.wine, className: "sm:col-span-4", ratio: "1 / 1" },
];

export type GalleryChapter = {
  slug: string;
  title: string;
  intro: string;
  items: readonly GalleryItem[];
};

/**
 * The gallery page, grouped into three chapters so the page reads as an
 * editorial rather than a wall of thumbnails.
 *
 * Within a chapter, frames on the same row share a height: the aspect ratios
 * are set proportional to their column span, and the stagger comes from the
 * translate offsets. That keeps the composition asymmetric without leaving
 * holes in the grid.
 */
export const galleryChapters: readonly GalleryChapter[] = [
  {
    slug: "the-room",
    title: "The Room",
    intro:
      "Low light, warm stone and a long bar. The dining room changes character between the first sitting and the last.",
    items: [
      { ...photo.diningRoomDusk, className: "sm:col-span-7", ratio: "14 / 9" },
      { ...photo.banquette, className: "sm:col-span-5 sm:translate-y-10", ratio: "10 / 9" },
      { ...photo.bar, className: "sm:col-span-4", ratio: "1 / 1" },
      { ...photo.archway, className: "sm:col-span-4 sm:-translate-y-8", ratio: "1 / 1" },
      { ...photo.placeSetting, className: "sm:col-span-4", ratio: "1 / 1" },
    ],
  },
  {
    slug: "the-kitchen",
    title: "The Kitchen",
    intro:
      "Pasta rolled before the doors open, sauces built from scratch, and a pass that runs quietly through service.",
    items: [
      { ...photo.rollingPasta, className: "sm:col-span-5", ratio: "10 / 9" },
      { ...photo.thePass, className: "sm:col-span-7 sm:translate-y-10", ratio: "14 / 9" },
      { ...photo.copperPan, className: "sm:col-span-4", ratio: "1 / 1" },
      { ...photo.finishing, className: "sm:col-span-4 sm:translate-y-8", ratio: "1 / 1" },
      { ...photo.prepTray, className: "sm:col-span-4", ratio: "1 / 1" },
    ],
  },
  {
    slug: "the-table",
    title: "The Table",
    intro: "The part we care most about: what happens once the food is down.",
    items: [
      { ...photo.wine, className: "sm:col-span-5", ratio: "10 / 9" },
      { ...photo.laidTable, className: "sm:col-span-7 sm:translate-y-10", ratio: "14 / 9" },
      { ...photo.sharedTable, className: "sm:col-span-6", ratio: "3 / 2" },
      { ...photo.friendsEating, className: "sm:col-span-6 sm:-translate-y-8", ratio: "3 / 2" },
    ],
  },
];
