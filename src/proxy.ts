import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Public routes - no auth required
  if (path === "/login" || path.startsWith("/api/")) {
    if (user && path === "/login") {
      // Already logged in, redirect to appropriate dashboard
      const role = user.user_metadata?.role;
      if (role === "admin") {
        return NextResponse.redirect(new URL("/brokers", request.url));
      }
      return NextResponse.redirect(new URL("/analytics", request.url));
    }
    return supabaseResponse;
  }

  // Protected routes - require auth
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = user.user_metadata?.role;

  // Admin routes
  if (path.startsWith("/brokers") || path.startsWith("/import")) {
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/analytics", request.url));
    }
  }

  // Broker routes (accessible by brokers and team members)
  if (
    path.startsWith("/analytics") ||
    path.startsWith("/leads") ||
    path.startsWith("/pipeline") ||
    path.startsWith("/speed-dialer")
  ) {
    if (role === "admin") {
      // Admins can't access broker routes
      return NextResponse.redirect(new URL("/brokers", request.url));
    }
    if (role !== "broker" && role !== "team_member") {
      // Must be a broker or team member to access these routes
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Settings route (broker only - for team member management)
  if (path.startsWith("/settings")) {
    if (role !== "broker") {
      return NextResponse.redirect(new URL("/analytics", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
