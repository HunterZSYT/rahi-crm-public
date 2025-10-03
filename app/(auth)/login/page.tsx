// app/login/page.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  // if already logged in, send to /clients
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (data.session) router.replace("/clients");
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setErr(error.message);
    else router.replace("/clients");
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-neutral-50">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-6 shadow"
      >
        <h1 className="text-xl font-semibold">Sign in</h1>

        <label className="block text-sm">
          <span className="mb-1 block">Email</span>
          <input
            className="w-full rounded-xl border bg-white p-2 outline-none focus:ring"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block">Password</span>
          <input
            className="w-full rounded-xl border bg-white p-2 outline-none focus:ring"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <button
          disabled={loading}
          className="w-full rounded-xl bg-black px-3 py-2 text-white disabled:opacity-50"
          type="submit"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        {/* tiny link back to landing */}
        <Link href="/" className="hover:underline">← Back to landing</Link>
      </form>
    </main>
  );
}
