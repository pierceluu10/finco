import { auth0, isAuthConfigured } from "./lib/auth0";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  if (!isAuthConfigured()) {
    return NextResponse.next();
  }
  const pathname = request.nextUrl.pathname;
  const isAuthRoute =
    pathname === "/auth/login" ||
    pathname === "/auth/logout" ||
    pathname === "/auth/callback" ||
    pathname.startsWith("/auth/");
  try {
    return await auth0.middleware(request);
  } catch (err) {
    if (isAuthRoute) {
      console.error("[Auth0 middleware error]", err);
      return new NextResponse(
        "Authentication error. Check server logs and Auth0 env (AUTH0_DOMAIN, callback URL).",
        { status: 500, headers: { "Content-Type": "text/plain" } }
      );
    }
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
