import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll().map(c => ({ name: c.name, value: c.value }));
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            res.cookies.set({ name, value, ...(options as CookieOptions | undefined) });
          });
        },
      },
    }
  );

  // Touch the session so it refreshes if needed
  await supabase.auth.getUser();

  return res;
}

// Skip static assets and API routes
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
