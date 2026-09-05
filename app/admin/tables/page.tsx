import { asc } from "drizzle-orm";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { ActionButton } from "@/components/admin/ActionButton";
import { TableForm } from "@/components/admin/TableForm";
import { setTableActive } from "@/app/admin/actions";
import { requireStaffPage } from "@/lib/auth/dal";
import { getDb, schema } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminTablesPage({ searchParams }: PageProps<"/admin/tables">) {
  await requireStaffPage();

  const query = await searchParams;
  const editId = Array.isArray(query.edit) ? query.edit[0] : query.edit;
  const saved = query.saved;

  const tables = await getDb().select().from(schema.tables).orderBy(asc(schema.tables.sortOrder));
  const editing = editId ? tables.find((t) => t.id === editId) : undefined;

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Tables"
        description="The dining room. Deactivate a table to take it out of service without losing its history."
      />

      {saved ? (
        <p role="status" className="border border-emerald-400/40 bg-emerald-400/5 p-4 text-sm text-emerald-300">
          Table saved.
        </p>
      ) : null}

      <div className="grid gap-10 lg:grid-cols-5 lg:gap-14">
        <section aria-labelledby="table-list-heading" className="lg:col-span-3">
          <h2 id="table-list-heading" className="font-display text-2xl font-light text-cream-100">
            {tables.length} {tables.length === 1 ? "table" : "tables"}
          </h2>

          {tables.length === 0 ? (
            <p className="mt-5 border border-dashed border-line px-5 py-10 text-center text-sm text-cream-400">
              No tables yet. Add the first one to start taking bookings.
            </p>
          ) : (
            <ul className="mt-5 divide-y divide-line border-y border-line">
              {tables.map((table) => (
                <li key={table.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div className="min-w-40">
                    <p className="font-display text-xl font-light text-cream-50">{table.name}</p>
                    <p className="lining-figures mt-1 text-xs text-cream-400">
                      {table.capacity} seats · {table.type} · {table.location}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex items-center border px-2.5 py-1 text-[0.625rem] font-medium uppercase tracking-[0.18em] ${
                        table.isActive
                          ? "border-emerald-400/45 text-emerald-300"
                          : "border-rose-400/45 text-rose-300"
                      }`}
                    >
                      {table.isActive ? "Active" : "Inactive"}
                    </span>
                    <a
                      href={`/admin/tables?edit=${table.id}`}
                      className="inline-flex min-h-10 items-center border border-line-strong px-3.5 text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-cream-200 transition-colors hover:border-amber-glow hover:text-amber-soft"
                    >
                      Edit
                    </a>
                    <ActionButton
                      label={table.isActive ? "Deactivate" : "Activate"}
                      pendingLabel="Saving…"
                      action={setTableActive.bind(null, table.id, !table.isActive)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="table-form-heading" className="lg:col-span-2">
          <h2 id="table-form-heading" className="font-display text-2xl font-light text-cream-100">
            {editing ? `Edit ${editing.name}` : "Add a table"}
          </h2>
          <div className="mt-5 border border-line bg-espresso-900/40 p-5">
            <TableForm key={editing?.id ?? "new"} table={editing} />
            {editing ? (
              <a
                href="/admin/tables"
                className="mt-5 inline-flex min-h-10 items-center text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-cream-400 transition-colors hover:text-amber-soft"
              >
                Cancel editing
              </a>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
