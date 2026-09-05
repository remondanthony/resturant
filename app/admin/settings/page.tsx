import { AdminPageHeader } from "@/components/admin/AdminShell";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { requireStaffPage } from "@/lib/auth/dal";
import { getBookingConfig } from "@/lib/booking/config";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const user = await requireStaffPage();
  const config = await getBookingConfig();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Settings"
        description="Booking rules for the whole restaurant. The public booking flow reads exactly these values."
      />

      <div className="max-w-3xl">
        <SettingsForm config={config} />
      </div>

      <section aria-labelledby="account-heading" className="max-w-3xl border-t border-line pt-8">
        <h2 id="account-heading" className="font-display text-xl font-light text-cream-100">
          Your account
        </h2>
        <dl className="mt-4 grid gap-x-10 sm:grid-cols-2">
          <div className="border-b border-line py-3.5">
            <dt className="text-[0.625rem] font-medium uppercase tracking-[0.2em] text-cream-400">
              Name
            </dt>
            <dd className="mt-1.5 text-sm text-cream-100">{user.name}</dd>
          </div>
          <div className="border-b border-line py-3.5">
            <dt className="text-[0.625rem] font-medium uppercase tracking-[0.2em] text-cream-400">
              Email
            </dt>
            <dd className="mt-1.5 text-sm text-cream-100">{user.email}</dd>
          </div>
        </dl>
        <p className="mt-5 max-w-prose text-sm/relaxed text-cream-400">
          Staff logins are managed from the command line — run{" "}
          <code className="border border-line px-1.5 py-0.5 text-xs text-cream-200">
            npm run staff:add
          </code>{" "}
          with ADMIN_EMAIL and ADMIN_PASSWORD set. Running it again for an existing email resets
          that password.
        </p>
      </section>
    </div>
  );
}
