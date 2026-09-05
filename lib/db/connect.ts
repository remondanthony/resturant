import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/lib/db/schema";

/**
 * Builds the database handle for whichever Postgres the URL points at.
 *
 * Neon is served over HTTP by `@neondatabase/serverless`; anything else (a
 * local Postgres, a container, a managed instance) speaks the normal wire
 * protocol via `pg`. Deciding here means the app, the CLI scripts and the
 * integration tests all connect the same way.
 *
 * No `server-only` marker: the setup scripts import this directly.
 */

export function isNeonUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(".neon.tech");
  } catch {
    return false;
  }
}

/**
 * The two drivers expose the same query builder for everything this app uses,
 * but their generic types differ. Both are presented as NodePgDatabase so
 * callers have one type to work with.
 */
export type Database = NodePgDatabase<typeof schema>;

export function createDb(url: string): Database {
  if (isNeonUrl(url)) {
    return drizzleNeon(neon(url), { schema }) as unknown as Database;
  }
  return drizzlePg(new Pool({ connectionString: url }), { schema });
}

export function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and add a connection string.",
    );
  }
  return url;
}

export { schema };
