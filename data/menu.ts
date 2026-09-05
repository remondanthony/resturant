/**
 * The menu — single source of truth for every dish on the site, including the
 * four the homepage features.
 *
 * PLACEHOLDER CONTENT. These dishes and prices stand in until the real menu is
 * confirmed; the menu page says so on the page itself. Swap the items here and
 * every surface updates.
 *
 * Menu pricing only. Reservation, table and deposit pricing belongs to a
 * separate booking configuration in a later phase — do not add it here.
 */

export const menuCurrency = "GBP";
export const menuLocale = "en-GB";

export type DietaryCode = "v" | "ve" | "gf" | "n";

export const dietaryLabels: Record<DietaryCode, string> = {
  v: "Vegetarian",
  ve: "Vegan",
  gf: "Gluten free",
  n: "Contains nuts",
};

export type MenuItem = {
  slug: string;
  name: string;
  description: string;
  price: number;
  /** Shown beside the price, e.g. "glass" or "for two". */
  unit?: string;
  dietary?: readonly DietaryCode[];
  /** Present when the homepage features this dish. */
  feature?: { order: number; origin: string; image: string };
};

export type MenuCategory = {
  slug: string;
  name: string;
  /** One line of context beneath the category heading. */
  note: string;
  items: readonly MenuItem[];
};

export const menu: readonly MenuCategory[] = [
  {
    slug: "antipasti",
    name: "Antipasti",
    note: "Small plates to open the table. Built for sharing.",
    items: [
      {
        slug: "burrata-pugliese",
        name: "Burrata Pugliese",
        description: "Whole burrata, late-summer tomatoes, basil oil, sea salt.",
        price: 14,
        dietary: ["v", "gf"],
      },
      {
        slug: "vitello-tonnato",
        name: "Vitello Tonnato",
        description: "Slow-cooked veal, tuna and caper emulsion, salted lemon.",
        price: 16,
        dietary: ["gf"],
      },
      {
        slug: "carciofi-fritti",
        name: "Carciofi Fritti",
        description: "Artichokes fried in olive oil, wild oregano, aioli.",
        price: 12,
        dietary: ["ve"],
      },
      {
        slug: "focaccia-al-rosmarino",
        name: "Focaccia al Rosmarino",
        description: "Proved overnight, rosemary, first-press oil, aged balsamic.",
        price: 7,
        dietary: ["ve"],
      },
    ],
  },
  {
    slug: "pasta",
    name: "Pasta",
    note: "Rolled and cut by hand every morning.",
    items: [
      {
        slug: "tagliatelle-al-ragu",
        name: "Tagliatelle al Ragù",
        description:
          "Hand-rolled egg pasta, eight-hour beef and pork ragù, aged Parmigiano shaved at the pass.",
        price: 26,
        feature: { order: 1, origin: "Emilia-Romagna", image: "/images/Tagliatelle.jpeg" },
      },
      {
        slug: "risotto-allo-zafferano",
        name: "Risotto allo Zafferano",
        description:
          "Carnaroli rice, Abruzzese saffron, bone marrow and a finish of cultured butter.",
        price: 24,
        dietary: ["gf"],
        feature: { order: 3, origin: "Lombardia", image: "/images/Risotto.jpeg" },
      },
      {
        slug: "agnolotti-del-plin",
        name: "Agnolotti del Plin",
        description:
          "Pinched by hand, filled with slow-roasted veal, dressed in its own roasting juices.",
        price: 28,
        // Placed here on the owner's instruction. Note the photograph shows a
        // fish course with mussels, not pinched pasta — swap it for a real
        // agnolotti shot when one is available.
        feature: { order: 4, origin: "Piemonte", image: "/images/Agnolotti.jpeg" },
      },
      {
        slug: "tagliolini-al-tartufo",
        name: "Tagliolini al Tartufo",
        description: "Handmade pasta, black truffle, Parmigiano.",
        price: 32,
        dietary: ["v"],
      },
      {
        slug: "cacio-e-pepe",
        name: "Cacio e Pepe",
        description: "Tonnarelli, Pecorino Romano, black pepper cracked to order.",
        price: 19,
        dietary: ["v"],
      },
    ],
  },
  {
    slug: "secondi",
    name: "Secondi",
    note: "Larger plates from the grill and the oven.",
    items: [
      {
        slug: "branzino-in-crosta",
        name: "Branzino in Crosta",
        description:
          "Whole sea bass baked in sea salt with fennel, Amalfi lemon and a spoon of green olive oil.",
        price: 34,
        unit: "for two",
        dietary: ["gf"],
        // Placed here on the owner's instruction. Note the photograph shows a
        // glazed meat baton, not whole salt-baked sea bass — swap it for a real
        // branzino shot when one is available.
        feature: { order: 2, origin: "Liguria", image: "/images/Branzino.jpeg" },
      },
      {
        slug: "bistecca-alla-griglia",
        name: "Bistecca alla Griglia",
        description: "Dry-aged sirloin over embers, rosemary, bone-marrow butter.",
        price: 42,
        dietary: ["gf"],
      },
      {
        slug: "pollo-al-mattone",
        name: "Pollo al Mattone",
        description: "Free-range chicken pressed under brick, lemon, chilli, thyme.",
        price: 27,
        dietary: ["gf"],
      },
      {
        slug: "melanzane-al-forno",
        name: "Melanzane al Forno",
        description: "Baked aubergine, San Marzano, smoked scamorza, basil.",
        price: 22,
        dietary: ["v"],
      },
    ],
  },
  {
    slug: "contorni",
    name: "Contorni",
    note: "Sides, plated simply.",
    items: [
      {
        slug: "patate-al-rosmarino",
        name: "Patate al Rosmarino",
        description: "Roast potatoes, rosemary, garlic confit.",
        price: 7,
        dietary: ["ve", "gf"],
      },
      {
        slug: "cime-di-rapa",
        name: "Cime di Rapa",
        description: "Broccoli rabe, chilli, anchovy, lemon.",
        price: 8,
        dietary: ["gf"],
      },
      {
        slug: "insalata-verde",
        name: "Insalata Verde",
        description: "Bitter leaves, white balsamic, olive oil.",
        price: 6,
        dietary: ["ve", "gf"],
      },
      {
        slug: "fagioli-all-uccelletto",
        name: "Fagioli all'Uccelletto",
        description: "Cannellini beans stewed with tomato, sage and oil.",
        price: 7,
        dietary: ["ve", "gf"],
      },
    ],
  },
  {
    slug: "dolci",
    name: "Dolci",
    note: "Made in-house, finished to order.",
    items: [
      {
        slug: "tiramisu",
        name: "Tiramisù",
        description: "Mascarpone, espresso, Savoiardi, bitter cocoa.",
        price: 10,
        dietary: ["v"],
      },
      {
        slug: "torta-caprese",
        name: "Torta Caprese",
        description: "Flourless almond and dark chocolate cake, crème fraîche.",
        price: 11,
        dietary: ["v", "gf", "n"],
      },
      {
        slug: "affogato",
        name: "Affogato",
        description: "Fior di latte gelato drowned in espresso.",
        price: 8,
        dietary: ["v", "gf"],
      },
      {
        slug: "sorbetto-al-limone",
        name: "Sorbetto al Limone",
        description: "Amalfi lemon sorbet, chilled limoncello.",
        price: 8,
        dietary: ["ve", "gf"],
      },
    ],
  },
  {
    slug: "wine-and-cocktails",
    name: "Wine & Cocktails",
    note: "A short list, chosen to sit alongside the food. Full cellar list in the room.",
    items: [
      {
        slug: "vermentino",
        name: "Vermentino, Liguria",
        description: "Dry, saline, citrus-led. Cuts through oil and salt.",
        price: 11,
        unit: "glass",
      },
      {
        slug: "barbera-d-asti",
        name: "Barbera d'Asti, Piemonte",
        description: "Bright acidity, dark cherry, soft tannin.",
        price: 13,
        unit: "glass",
      },
      {
        slug: "chianti-classico",
        name: "Chianti Classico, Toscana",
        description: "Sangiovese, savoury and dried herb. Made for the bistecca.",
        price: 54,
        unit: "bottle",
      },
      {
        slug: "negroni-sbagliato",
        name: "Negroni Sbagliato",
        description: "Campari, sweet vermouth, Franciacorta.",
        price: 13,
      },
      {
        slug: "americano",
        name: "Americano",
        description: "Campari, vermouth di Torino, soda, orange.",
        price: 11,
      },
      {
        slug: "amaro-del-giorno",
        name: "Amaro del Giorno",
        description: "A different bottle from the back bar each evening.",
        price: 9,
      },
    ],
  },
];

export type Dish = {
  slug: string;
  name: string;
  origin: string;
  description: string;
  price: number;
  image: string;
};

/**
 * The dishes the homepage features, derived from the menu above so a dish is
 * only ever described in one place.
 */
export const signatureDishes: readonly Dish[] = menu
  .flatMap((category) => category.items)
  .filter((item): item is MenuItem & { feature: NonNullable<MenuItem["feature"]> } =>
    item.feature !== undefined,
  )
  .sort((a, b) => a.feature.order - b.feature.order)
  .map((item) => ({
    slug: item.slug,
    name: item.name,
    origin: item.feature.origin,
    description: item.description,
    price: item.price,
    image: item.feature.image,
  }));
