import { ActionButton } from "@/components/admin/ActionButton";
import { resendNotification } from "@/app/admin/actions";
import { formatPhone } from "@/lib/booking/phone";
import type { NotificationRow } from "@/lib/db/schema";

const STATUS_STYLES: Record<NotificationRow["status"], { label: string; className: string }> = {
  pending: { label: "Queued", className: "border-line text-cream-400" },
  sent: { label: "Sent", className: "border-emerald-400/45 text-emerald-300" },
  // Says plainly that nothing actually left the building.
  simulated: { label: "Simulated", className: "border-amber-glow/50 text-amber-soft" },
  failed: { label: "Failed", className: "border-rose-400/50 text-rose-300" },
};

const EVENT_LABELS: Record<NotificationRow["event"], string> = {
  booking_received: "Request received",
  booking_confirmed: "Booking confirmed",
  booking_modified: "Booking changed",
  booking_cancelled: "Booking cancelled",
  booking_completed: "Booking completed",
};

/**
 * What was sent to this guest, and what happened to it.
 *
 * A failed message never affects the reservation — it is recorded here and can
 * be retried. With no provider configured every attempt reads "Simulated", so
 * staff are never misled into thinking the guest heard from us.
 */
export function NotificationHistory({
  notifications,
}: {
  notifications: readonly NotificationRow[];
}) {
  return (
    <section aria-labelledby="notifications-heading">
      <h2 id="notifications-heading" className="font-display text-xl font-light text-cream-100">
        Messages
      </h2>

      {notifications.length === 0 ? (
        <p className="mt-4 border border-dashed border-line px-4 py-6 text-center text-xs text-cream-400">
          Nothing sent yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {notifications.map((notification) => {
            const style = STATUS_STYLES[notification.status];
            return (
              <li key={notification.id} className="border border-line p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[0.625rem] font-medium uppercase tracking-[0.18em] text-cream-400">
                    {EVENT_LABELS[notification.event]}
                  </span>
                  <span
                    className={`border px-2 py-0.5 text-[0.5625rem] font-medium uppercase tracking-[0.16em] ${style.className}`}
                  >
                    {style.label}
                  </span>
                </div>

                <p className="lining-figures mt-2 text-xs text-cream-400">
                  {formatPhone(notification.recipient)}
                </p>
                <p className="mt-2 text-xs/relaxed text-cream-300">{notification.message}</p>

                {notification.status === "simulated" ? (
                  <p className="mt-2 text-[0.6875rem] text-cream-400">
                    No messaging provider is configured, so this was not delivered.
                  </p>
                ) : null}

                {notification.status === "failed" ? (
                  <div className="mt-3 space-y-2">
                    {notification.error ? (
                      <p className="text-[0.6875rem] text-rose-300">{notification.error}</p>
                    ) : null}
                    <ActionButton
                      label="Retry"
                      pendingLabel="Sending…"
                      action={resendNotification.bind(null, notification.id)}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
