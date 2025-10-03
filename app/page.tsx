// app/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";

export default function LandingPage() {
  const [authed, setAuthed] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setAuthed(Boolean(data.session));
      setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const ctaHref = authed ? "/clients" : "/login";
  const ctaLabel = authed ? "Go to Dashboard" : "View Dashboard";

  return (
    <main className="relative min-h-dvh overflow-hidden bg-neutral-950 text-white">
      {/* animated blobs */}
      <motion.div
        className="pointer-events-none absolute -top-40 -left-40 h-[36rem] w-[36rem] rounded-full blur-3xl"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.6, scale: [0.8, 1.1, 0.9, 1] }}
        transition={{ duration: 10, repeat: Infinity, repeatType: "mirror" }}
        style={{
          background:
            "radial-gradient( circle at 30% 30%, rgba(99,102,241,0.6), rgba(236,72,153,0.35) 40%, transparent 60% )",
        }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-40 -right-40 h-[36rem] w-[36rem] rounded-full blur-3xl"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.55, scale: [1, 1.15, 0.95, 1.05] }}
        transition={{ duration: 12, repeat: Infinity, repeatType: "mirror", delay: 0.2 }}
        style={{
          background:
            "radial-gradient( circle at 70% 70%, rgba(34,197,94,0.55), rgba(14,165,233,0.35) 40%, transparent 60% )",
        }}
      />

      {/* top nav */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="h-13 w-40 overflow-hidden rounded-xl ring-1 ring-white/10">
            <Image src="/logo.jpg" alt="Logo" width={200} height={100} className="h-full w-full object-cover" />
          </div>
          <div className="text-sm text-white/70">Tahsin Hosen Rahi</div>
        </div>

        {ready && (
          <Link
            href={ctaHref}
            className="rounded-xl bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur hover:bg-white/20"
          >
            {authed ? "Open Clients" : "Sign in"}
          </Link>
        )}
      </div>

      {/* hero */}
      <section className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-6 pt-12 pb-20 md:grid-cols-[1.1fr,0.9fr] md:pt-20">
        <div>
          <motion.h1
            className="text-4xl font-semibold leading-tight md:text-6xl"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            Voice Over Artist &<br /> Brand Promoter
          </motion.h1>

          <motion.p
            className="mt-4 max-w-xl text-base text-white/70 md:text-lg"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Manage clients, work, payments, and invoices in one tidy dashboard built for{" "}
            <span className="text-white">Tahsin Hosen Rahi</span>.
          </motion.p>

          <motion.div
            className="mt-8 flex flex-wrap items-center gap-3"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Link
              href={ctaHref}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-neutral-900 shadow hover:bg-white/90"
            >
              {ctaLabel}
            </Link>
            <span className="text-xs text-white/60">No signup. Just you.</span>
          </motion.div>
        </div>

        <motion.div
          className="relative h-[260px] w-full rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.03] p-4 shadow-2xl md:h-[360px]"
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          {/* subtle animated “cards” preview */}
          <div className="grid h-full grid-cols-2 gap-4">
            <motion.div
              className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3.8, repeat: Infinity }}
            >
              <div className="h-3 w-24 rounded bg-white/20" />
              <div className="mt-3 space-y-2">
                <div className="h-2 w-5/6 rounded bg-white/10" />
                <div className="h-2 w-4/6 rounded bg-white/10" />
                <div className="h-2 w-3/6 rounded bg-white/10" />
              </div>
            </motion.div>
            <motion.div
              className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10"
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 3.6, repeat: Infinity }}
            >
              <div className="h-3 w-20 rounded bg-white/20" />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="h-16 rounded-xl bg-white/10" />
                <div className="h-16 rounded-xl bg-white/10" />
                <div className="h-16 rounded-xl bg-white/10" />
                <div className="h-16 rounded-xl bg-white/10" />
              </div>
            </motion.div>
          </div>

          {/* colored logo badge in corner */}
          <div className="pointer-events-none absolute -bottom-4 -right-4 rounded-2xl bg-white text-neutral-900 shadow-xl">
            <div className="flex items-center gap-2 rounded-2xl p-2 pl-2.5 pr-3">
              <Image
                src="/logo.jpg"
                alt="Logo"
                width={150}
                height={150}
                className="h-9 w-25 rounded-xl object-cover"
              />
              <span className="text-xs font-semibold">TR Dashboard</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* footer */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 pb-8">
        <p className="text-xs text-white/50">© {new Date().getFullYear()} Tahsin Hosen Rahi</p>
      </div>
    </main>
  );
}
