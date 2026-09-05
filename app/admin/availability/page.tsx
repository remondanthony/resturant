import { asc, eq, gte } from "drizzle-orm";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { BlockTableForm, ClosureForm } from "@/components/admin/AvailabilityForms";
import { removeClosure, removeTableBlock } from "@/app/admin/actions";
import { requireStaffPage } from "@/lib/auth/dal";
import { getDb, schema } from "@/lib/db";
import { formatLongDate, formatTime, restaurantToday } from "@/lib/booking/time";

export const dynamic = "force-dynamic";

export default async function AdminAvailabilityPage() {
  await requireStaffPage();

  const today = restaurantToday();
  const db = getDb();

  const [tables, blocks, closures] = await Promise.all([
    db.select().from(schema.tables).orderBy(asc(schema.tables.sortOrder)),
    db
      .select({ block: schema.tableBlocks, table: schema.tables })
      .from(schema.tableBlocks)
      .innerJoin(schema.tables, eq(schema.tableBlocks.tableId, schema.tables.id))
      .where(gte(schema.tableBlocks.blockDate, today))
      .orderBy(asc(schema.tableBlocks.blockDate), asc(schema.tables.sortOrder)),
    db
      .select()
      .from(schema.closures)
      .where(gte(schema.closures.closureDate, today))
      .orderBy(asc(schema.closures.closureDate)),
  ]);

  const upcomingBlocks = blocks.map((row) => ({ ...row.block, table: row.table }));

  function period(start: string | null, end: string | null) {
    if (!start || !end) return "All day";
    return `${formatTime(start)} — ${formatTime(end)}`;
  }

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Availability"
        description="Take a table out for a while, or close the restaurant. Customer booking respects both immediately."
      />

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        <section aria-labelledby="closures-heading">
          <h2 id="closures-heading" className="font-display text-2xl font-light text-cream-100">
            Restaurant closures
          </h2>
          <p className="mt-2 text-sm text-cream-400">
            Close a whole date, or block a period for a private event.
          </p>

          <div className="mt-6 border border-line bg-espresso-900/40 p-5">
            <ClosureForm />
          </div>

          <h3 className="mt-8 text-[0.625rem] font-medium uppercase tracking-[0.2em] text-cream-400">
            Upcoming closures
          </h3>
          {closures.length === 0 ? (
            <p className="mt-4 border border-dashed border-line px-5 py-8 text-center text-sm text-cream-400">
              No closures scheduled.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {closures.map((closure) => (
                <li key={closure.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div>
                    <p className="text-sm text-cream-100">{formatLongDate(closure.closureDate)}</p>
                    <p className="lining-figures mt-1 text-xs text-cream-400">
                      {period(closure.startTime, closure.endTime)} · {closure.reason}
                    </p>
                  </div>
                  <ConfirmButton
                    label="Remove"
                    tone="danger"
                    title="Remove this closure?"
                    body={`${formatLongDate(closure.closureDate)} will reopen for bookings.`}
                    confirmLabel="Remove closure"
                    action={removeClosure.bind(null, closure.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="blocks-heading">
          <h2 id="blocks-heading" className="font-display text-2xl font-light text-cream-100">
            Table blocks
          </h2>
          <p className="mt-2 text-sm text-cream-400">
            A blocked table stays in the system with its history — it is simply not offered.
          </p>

          <div className="mt-6 border border-line bg-espresso-900/40 p-5">
            <BlockTableForm tables={tables} />
          </div>

          <h3 className="mt-8 text-[0.625rem] font-medium uppercase tracking-[0.2em] text-cream-400">
            Upcoming blocks
          </h3>
          {upcomingBlocks.length === 0 ? (
            <p className="mt-4 border border-dashed border-line px-5 py-8 text-center text-sm text-cream-400">
              No tables blocked.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {upcomingBlocks.map((block) => (
                <li key={block.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div>
                    <p className="text-sm text-cream-100">
                      {block.table.name} · {formatLongDate(block.blockDate)}
                    </p>
                    <p className="lining-figures mt-1 text-xs text-cream-400">
                      {period(block.startTime, block.endTime)} · {block.reason}
                    </p>
                  </div>
                  <ConfirmButton
                    label="Remove"
                    tone="danger"
                    title="Remove this block?"
                    body="The table will be offered for booking again in that period."
                    confirmLabel="Remove block"
                    action={removeTableBlock.bind(null, block.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
