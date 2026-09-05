/**
 * Seeds the dining room and the default booking rules.
 *
 * Safe to re-run: tables are matched by name and settings by its fixed id, so
 * nothing is duplicated and no reservation data is touched.
 *
 * Run with: npm run db:seed
 */
import { eq } from "drizzle-orm";
import * as schema from "../lib/db/schema";
import { createDb } from "../lib/db/connect";
import { defaultBookingConfig } from "../lib/booking/config-defaults";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local first.");
  process.exit(1);
}

const db = createDb(url);

/** A plausible small dining room. Edit freely from /admin/tables afterwards. */
const diningRoom = [
  { name: "Table 01", capacity: 2, type: "window", location: "Window", sortOrder: 1 },
  { name: "Table 02", capacity: 2, type: "window", location: "Window", sortOrder: 2 },
  { name: "Table 03", capacity: 4, type: "standard", location: "Main room", sortOrder: 3 },
  { name: "Table 04", capacity: 4, type: "standard", location: "Main room", sortOrder: 4 },
  { name: "Table 05", capacity: 4, type: "booth", location: "Main room", sortOrder: 5 },
  { name: "Table 06", capacity: 6, type: "booth", location: "Main room", sortOrder: 6 },
  { name: "Table 07", capacity: 6, type: "standard", location: "Main room", sortOrder: 7 },
  { name: "Table 08", capacity: 2, type: "standard", location: "Bar", sortOrder: 8 },
  { name: "Table P01", capacity: 6, type: "private", location: "Private room", sortOrder: 20, isPrivateDining: true },
  { name: "Table P02", capacity: 8, type: "private", location: "Private room", sortOrder: 21, isPrivateDining: true },
  { name: "Table P03", capacity: 12, type: "private", location: "Garden room", sortOrder: 22, isPrivateDining: true },
  { name: "Table 10", capacity: 4, type: "outdoor", location: "Terrace", sortOrder: 10 },
];

let created = 0;
for (const table of diningRoom) {
  const existing = await db
    .select({ id: schema.tables.id })
    .from(schema.tables)
    .where(eq(schema.tables.name, table.name))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(schema.tables).values(table);
    created += 1;
  }
}

const existingSettings = await db
  .select({ id: schema.settings.id })
  .from(schema.settings)
  .where(eq(schema.settings.id, "default"))
  .limit(1);

if (existingSettings.length === 0) {
  const { serviceHours, ...rest } = defaultBookingConfig;
  await db.insert(schema.settings).values({
    id: "default",
    ...rest,
    serviceHours: JSON.stringify(serviceHours),
  });
  console.log("✓ Default booking rules written");
} else {
  console.log("• Booking rules already present, left alone");
}

console.log(`✓ Seed complete — ${created} table(s) created, ${diningRoom.length - created} already existed`);
