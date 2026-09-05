import { ActionButton } from "@/components/admin/ActionButton";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { changeReservationStatus } from "@/app/admin/actions";
import type { ReservationStatus } from "@/lib/db/schema";

/**
 * Actions for one reservation, chosen by its current status.
 *
 * Only the transitions that make sense are offered — a confirmed booking can
 * be seated or cancelled; a seated one completed or marked a no-show. A closed
 * booking offers nothing but a way back.
 *
 * A Server Component: it holds no state, and the actions are bound server-side
 * so the reservation id is fixed on the server rather than supplied by the
 * browser. Every action re-checks authorization regardless.
 */

type Transition = {
  label: string;
  status: ReservationStatus;
  /** Irreversible or disputable moves ask first. */
  confirm?: { title: string; body: string; confirmLabel: string; danger?: boolean };
  primary?: boolean;
};

function transitionsFor(status: ReservationStatus, guestName: string): Transition[] {
  switch (status) {
    case "pending":
    case "confirmed":
      return [
        { label: "Mark Arrived", status: "seated", primary: true },
        {
          label: "Cancel",
          status: "cancelled",
          confirm: {
            title: "Cancel this reservation?",
            body: `${guestName}'s booking will be cancelled and the table released.`,
            confirmLabel: "Cancel booking",
            danger: true,
          },
        },
      ];

    case "seated":
      return [
        { label: "Mark Completed", status: "completed", primary: true },
        {
          label: "No Show",
          status: "no_show",
          confirm: {
            title: "Mark as a no show?",
            body: `${guestName} is currently seated. Marking a no show will record them as never having arrived.`,
            confirmLabel: "Mark no show",
          },
        },
      ];

    // Completed, no-show and cancelled are settled; only reinstatement remains.
    default:
      return [{ label: "Reinstate", status: "confirmed" }];
  }
}

export function ReservationActions({
  reservationId,
  status,
  guestName,
  className = "",
}: {
  reservationId: string;
  status: ReservationStatus;
  guestName: string;
  className?: string;
}) {
  const transitions = transitionsFor(status, guestName);

  return (
    <div className={`flex flex-wrap items-start gap-2.5 ${className}`}>
      {transitions.map((transition) =>
        transition.confirm ? (
          <ConfirmButton
            key={transition.status}
            label={transition.label}
            tone={transition.confirm.danger ? "danger" : "default"}
            title={transition.confirm.title}
            body={transition.confirm.body}
            confirmLabel={transition.confirm.confirmLabel}
            action={changeReservationStatus.bind(null, reservationId, transition.status)}
          />
        ) : (
          <ActionButton
            key={transition.status}
            label={transition.label}
            pendingLabel="Saving…"
            variant={transition.primary ? "solid" : "outline"}
            action={changeReservationStatus.bind(null, reservationId, transition.status)}
          />
        ),
      )}
    </div>
  );
}
