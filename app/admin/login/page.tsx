import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { getStaffUser } from "@/lib/auth/dal";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Staff sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  if (await getStaffUser()) redirect("/admin");

  return (
    <main className="grid min-h-dvh place-items-center bg-espresso-950 px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <p className="font-display text-2xl font-light uppercase tracking-[0.34em] text-cream-100">
            <span className="-mr-[0.34em]">{site.name}</span>
          </p>
          <h1 className="mt-8 font-display text-3xl font-light text-cream-50">Staff sign in</h1>
          <p className="mt-3 text-sm text-cream-400">
            This area is for restaurant staff.
          </p>
        </div>

        <div className="mt-10">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
