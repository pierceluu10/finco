import { NextRequest, NextResponse } from "next/server";
import { auth0, isAuthConfigured } from "@/lib/auth0";

const PUBLIC_PATHS = ["/", "/ecosystem", "/onboarding", "/login", "/signup"];
const PUBLIC_PREFIXES = ["/api/ai/", "/api/parse-csv/"];

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/auth/")) return false;
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p + "/"))) return true;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/auth/") && isAuthConfigured() && auth0) {
    try {
      return await auth0.middleware(request);
    } catch (err) {
      console.error("[Auth0 middleware error]", err);
      return new NextResponse(
        "Authentication error. Check server logs and Auth0 env.",
        { status: 500, headers: { "Content-Type": "text/plain" } }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
