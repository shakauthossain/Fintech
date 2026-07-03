import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function serverApiBase() {
  return process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const API = serverApiBase();

  if (pathname.startsWith("/login")) {
    try {
      const res = await fetch(`${API}/api/auth/me`, {
        headers: { cookie: request.headers.get("cookie") || "" },
        cache: "no-store",
      });
      if (res.ok) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    } catch {
      // Backend unreachable — show login form
    }
    return NextResponse.next();
  }

  try {
    const res = await fetch(`${API}/api/auth/me`, {
      headers: { cookie: request.headers.get("cookie") || "" },
      cache: "no-store",
    });
    if (res.ok) return NextResponse.next();
  } catch {
    // Backend unreachable — still send user to login
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Do not run auth middleware on /api/* — those are proxied to the backend.
  // Intercepting POST /api/auth/login used to 307-redirect to /login (POST preserved) → 405.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
