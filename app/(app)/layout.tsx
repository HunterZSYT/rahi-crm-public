import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "./_components/AppShell";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { LogOut } from "lucide-react";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Server action: guaranteed cookie cleanup + redirect to landing page
  async function logout() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/"); // landing page
  }

  return (
    <div className="mx-auto w-full max-w-none px-4 py-10 sm:px-6 lg:px-10">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <form action={logout}>
            <button
              className="inline-flex items-center gap-2 rounded-xl border bg-white/70 px-3 py-1.5 text-sm font-medium transition-[transform,background-color] hover:bg-white active:scale-[.98] dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-200 dark:hover:bg-neutral-900"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </form>
        </div>
      </header>

      {/* Client shell: progress bar, page transitions, parallax BG, motion config */}
      <AppShell>{children}</AppShell>
    </div>
  );
}
