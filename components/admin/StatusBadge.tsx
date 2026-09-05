import type { ReservationStatus } from "@/lib/db/schema";

/**
 * The one place a reservation status is rendered.
 *
 * Status is information, never an action. Every view reads the same canonical
 * `status` column, so a booking cannot read CONFIRMED in one place and SEATED
 * in another. The word carries the meaning — colour only reinforces it.
 */
const STYLES: Record<ReservationStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "border-amber-glow/45 text-amber-soft" },
  confirmed: { label: "Confirmed", className: "border-emerald-400/45 text-emerald-300" },
  seated: { label: "Seated", className: "border-amber-glow/60 bg-amber-glow/10 text-amber-soft" },
  completed: { label: "Completed", className: "border-sky-400/40 text-sky-300" },
  no_show: { label: "No show", className: "border-rose-400/50 text-rose-300" },
  cancelled: { label: "Cancelled", className: "border-cream-400/35 text-cream-400" },
};

export function StatusBadge({
  status,
  className = "",
}: {
  status: ReservationStatus;
  className?: string;
}) {
  const style = STYLES[status];
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap border px-2.5 py-1 text-[0.625rem] font-medium uppercase tracking-[0.18em] ${style.className} ${className}`}
    >
      {style.label}
    </span>
  );
}

export function statusLabel(status: ReservationStatus): string {
  return STYLES[status].label;
}

const TABLE_STATE_STYLES = {
  available: { label: "Available", className: "border-line text-cream-400" },
  reserved: { label: "Reserved", className: "border-emerald-400/45 text-emerald-300" },
  occupied: { label: "Occupied", className: "border-amber-glow/60 bg-amber-glow/10 text-amber-soft" },
  unavailable: { label: "Unavailable", className: "border-rose-400/45 text-rose-300" },
} as const;

export type TableState = keyof typeof TABLE_STATE_STYLES;

export function TableStateBadge({ state }: { state: TableState }) {
  const style = TABLE_STATE_STYLES[state];
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap border px-2 py-0.5 text-[0.5625rem] font-medium uppercase tracking-[0.16em] ${style.className}`}
    >
      {style.label}
    </span>
  );
}
