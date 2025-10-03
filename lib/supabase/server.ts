// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Always create a fresh client per request.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // rename your env var or keep this line if you used the doc’s name
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll(); // [{ name, value, ... }]
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              // this signature is fine with the current Next
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component; safe to ignore if you refresh the session in middleware.
          }
        },
      },
    }
  );
}
