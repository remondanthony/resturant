/**
 * Private dining content. Placeholder copy — deliberately non-committal about
 * services, capacities and pricing until the restaurant confirms them.
 */

export type EventType = {
  index: string;
  title: string;
  description: string;
};

export const eventTypes: readonly EventType[] = [
  {
    index: "01",
    title: "Private dinners",
    description: "The room to yourself, a set menu agreed in advance, and one team looking after the table.",
  },
  {
    index: "02",
    title: "Birthdays",
    description: "Long tables, shared plates and a dolce brought out at whatever moment you choose.",
  },
  {
    index: "03",
    title: "Anniversaries",
    description: "A quieter corner, a slower pace, and a menu built around what the evening means.",
  },
  {
    index: "04",
    title: "Corporate gatherings",
    description: "Dinners and lunches for a working group, with timings arranged around your schedule.",
  },
  {
    index: "05",
    title: "Celebrations",
    description: "Whatever the occasion — tell us what you have in mind and we will plan it with you.",
  },
];

export type ExperiencePoint = {
  title: string;
  description: string;
};

export const experiencePoints: readonly ExperiencePoint[] = [
  {
    title: "Curated menus",
    description:
      "Menus are written with you ahead of the evening, drawn from what the kitchen has at its best that week.",
  },
  {
    title: "Intimate seating",
    description:
      "A separate room with its own layout, arranged to suit the shape of the evening you want.",
  },
  {
    title: "Personalised service",
    description:
      "A dedicated team for the duration, briefed on the occasion and the pace you would like to keep.",
  },
  {
    title: "Special occasions",
    description:
      "Tell us what is being marked and we will plan the details with you rather than assume them.",
  },
];

/** Options for the enquiry form's event type field. */
export const eventTypeOptions: readonly string[] = [
  "Private dinner",
  "Birthday",
  "Anniversary",
  "Corporate gathering",
  "Celebration",
  "Something else",
];
