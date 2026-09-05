import "server-only";

import { createDb, requireDatabaseUrl, type Database } from "@/lib/db/connect";
import * as schema from "@/lib/db/schema";

/**
 * The database handle. Server-only — importing this from a Client Component is
 * a build error, which is the point.
 *
 * Driver selection lives in `connect.ts` so the CLI scripts share it.
 */

let cached: Database | null = null;

/** Lazily created so a missing DATABASE_URL fails at query time, not import time. */
export function getDb(): Database {
  if (!cached) cached = createDb(requireDatabaseUrl());
  return cached;
}

export { schema };
