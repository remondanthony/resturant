import { TableStateBadge } from "@/components/admin/StatusBadge";
import { formatTime } from "@/lib/booking/time";
import type { FloorTable } from "@/lib/booking/floor";

const STATE_BORDER = {
  available: "border-line",
  reserved: "border-emerald-400/45",
  occupied: "border-amber-glow/50",
  unavailable: "border-rose-400/40 opacity-60",
} as const;

/**
 * Table layout grouped by where tables sit in the room. A grid of plates on
 * larger screens, a stacked list on phones — the same information either way.
 * Every state here is derived from the book (lib/booking/floor.ts).
 */
export function FloorPlan({ tables }: { tables: FloorTable[] }) {
  const areas = new Map<string, FloorTable[]>();
  for (const entry of tables) {
    const list = areas.get(entry.table.location) ?? [];
    list.push(entry);
    areas.set(entry.table.location, list);
  }

  return (
    <div className="space-y-8">
      {[...areas.entries()].map(([location, group]) => (
        <section key={location} aria-labelledby={`area-${location}`}>
          <h3
            id={`area-${location}`}
            className="text-[0.625rem] font-medium uppercase tracking-[0.22em] text-cream-400"
          >
            {location}
          </h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {group.map((entry) => (
              <li
                key={entry.table.id}
                className={`border bg-espresso-900/60 p-4 ${STATE_BORDER[entry.state]}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-xl font-light text-cream-50">
                      {entry.table.name}
                    </p>
                    <p className="lining-figures mt-1 text-xs text-cream-400">
                      {entry.table.capacity} seats · {entry.table.type}
                    </p>
                  </div>
                  <TableStateBadge state={entry.state} />
                </div>

                <div className="mt-3 min-h-9 border-t border-line pt-3 text-xs/relaxed">
                  {entry.current ? (
                    <p className="text-cream-200">
                      <span className="lining-figures">{formatTime(entry.current.startTime)}</span>
                      {" · "}
                      {entry.current.guestName}
                      {" · "}
                      <span className="lining-figures">{entry.current.partySize}</span> guests
                    </p>
                  ) : entry.blockedReason ? (
                    <p className="text-rose-300/90">{entry.blockedReason}</p>
                  ) : entry.nextTime ? (
                    <p className="lining-figures text-cream-400">
                      Next at {formatTime(entry.nextTime)}
                    </p>
                  ) : (
                    <p className="text-cream-400">Free for the rest of service</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
