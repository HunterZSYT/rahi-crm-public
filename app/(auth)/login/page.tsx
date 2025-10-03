"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setErr(error.message);
    else router.replace("/");
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-neutral-50">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-6 shadow">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <label className="block text-sm">
          <span className="mb-1 block">Email</span>
          <input
            className="w-full rounded-xl border bg-white p-2 outline-none focus:ring"
            type="email" value={email} onChange={e => setEmail(e.target.value)} required
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block">Password</span>
          <input
            className="w-full rounded-xl border bg-white p-2 outline-none focus:ring"
            type="password" value={password} onChange={e => setPassword(e.target.value)} required
          />
        </label>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button
          disabled={loading}
          className="w-full rounded-xl bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
