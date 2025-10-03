import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-none px-4 sm:px-6 lg:px-10 py-10">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <form action="/auth/logout" method="post">
          <button className="rounded-xl border px-3 py-1.5">Sign out</button>
        </form>
      </header>
      {children}
    </div>
  );
}
