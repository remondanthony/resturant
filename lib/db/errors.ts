/**
 * Postgres error details, dug out from however the driver wrapped them.
 *
 * Drizzle raises a `DrizzleQueryError` whose `cause` carries the real driver
 * error, so the SQLSTATE code is one or more levels down. Reading `error.code`
 * directly silently misses every constraint violation.
 */

export type PgErrorInfo = {
  /** SQLSTATE, e.g. "23P01" exclusion violation, "23505" unique violation. */
  code?: string;
  detail?: string;
  constraint?: string;
};

export function pgError(error: unknown): PgErrorInfo {
  let current: unknown = error;

  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth += 1) {
    const candidate = current as {
      code?: unknown;
      detail?: unknown;
      constraint?: unknown;
      cause?: unknown;
    };

    if (typeof candidate.code === "string") {
      return {
        code: candidate.code,
        detail: typeof candidate.detail === "string" ? candidate.detail : undefined,
        constraint: typeof candidate.constraint === "string" ? candidate.constraint : undefined,
      };
    }
    current = candidate.cause;
  }

  return {};
}

/** The exclusion constraint that makes overlapping reservations impossible. */
export const EXCLUSION_VIOLATION = "23P01";
export const UNIQUE_VIOLATION = "23505";
