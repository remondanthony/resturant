/**
 * About page content. Placeholder copy — no chef names, awards, press or
 * history are invented here; those wait for real information.
 */

export type ApproachPillar = {
  index: string;
  title: string;
  description: string;
};

export const approachPillars: readonly ApproachPillar[] = [
  {
    index: "01",
    title: "Italian cuisine",
    description:
      "Regional rather than generic. A dish belongs to somewhere, and we cook it the way that place cooks it, without adding flourishes it never asked for.",
  },
  {
    index: "02",
    title: "Seasonal ingredients",
    description:
      "The menu is rewritten as the markets change. If something is not at its best this week, it comes off the list until it is.",
  },
  {
    index: "03",
    title: "Craftsmanship",
    description:
      "Pasta rolled each morning, bread proved overnight, stocks and sauces built from scratch. Slow methods, kept because they work.",
  },
  {
    index: "04",
    title: "Hospitality",
    description:
      "Attentive without hovering. The best compliment we get is that nobody noticed how much was being handled for them.",
  },
];
