/**
 * Single source of truth for brand, contact and navigation content.
 * Presentation components read from here so copy changes never require
 * touching markup.
 */
export const site = {
  name: "TAVOLO",
  tagline: "Italian cuisine, crafted with passion.",
  description:
    "TAVOLO is a modern Italian dining room built around seasonal produce, handmade pasta and long evenings at the table.",
  url: "https://tavolo.example",
  contact: {
    address: ["48 Ardenne Street", "Hartwell District", "London EC2A 4TX"],
    phone: "+44 20 7946 0182",
    phoneHref: "tel:+442079460182",
    email: "reservations@tavolo.example",
  },
  hours: [
    { days: "Tuesday — Thursday", time: "17:30 — 23:00" },
    { days: "Friday — Saturday", time: "12:00 — 00:00" },
    { days: "Sunday", time: "12:00 — 21:00" },
    { days: "Monday", time: "Closed" },
  ],
} as const;

export type NavLink = { label: string; href: string };

/** Primary navigation — shared by the desktop bar, mobile menu and footer. */
export const navLinks: readonly NavLink[] = [
  { label: "Menu", href: "/menu" },
  { label: "About", href: "/about" },
  { label: "Private Dining", href: "/private-dining" },
  { label: "Gallery", href: "/gallery" },
  { label: "Contact", href: "/contact" },
];

export const RESERVATIONS_HREF = "/reservations";

/**
 * Every page, for the footer. The header keeps the shorter `navLinks` list
 * because Home lives on the wordmark and Reservations on the CTA button.
 */
export const footerNavLinks: readonly NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Menu", href: "/menu" },
  { label: "About", href: "/about" },
  { label: "Reservations", href: RESERVATIONS_HREF },
  { label: "Private Dining", href: "/private-dining" },
  { label: "Gallery", href: "/gallery" },
  { label: "Contact", href: "/contact" },
];

/** External profiles. Swap the placeholder URLs for the real accounts. */
export const socialLinks: readonly NavLink[] = [
  { label: "Instagram", href: "https://www.instagram.com/" },
  { label: "Facebook", href: "https://www.facebook.com/" },
];
