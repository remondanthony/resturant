/**
 * Applies pending migrations. Run with: npm run db:migrate
 */
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { migrate as migrateNeon } from "drizzle-orm/neon-http/migrator";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { isNeonUrl } from "../lib/db/connect";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local first.");
  process.exit(1);
}

const folder = "./drizzle";

if (isNeonUrl(url)) {
  await migrateNeon(drizzleNeon(neon(url)), { migrationsFolder: folder });
} else {
  const pool = new Pool({ connectionString: url });
  await migratePg(drizzlePg(pool), { migrationsFolder: folder });
  await pool.end();
}

console.log("✓ Migrations applied");
