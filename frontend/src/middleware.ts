import { NextRequest, NextResponse } from "next/server";

// Routes that require the user to be authenticated
const PROTECTED_HR_ROUTES = ["/dashboard", "/jobs"];
const PROTECTED_CANDIDATE_ROUTES = ["/candidate", "/apply"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if this path needs protection
  const needsHrAuth = PROTECTED_HR_ROUTES.some((r) => pathname.startsWith(r));
  const needsCandidateAuth = PROTECTED_CANDIDATE_ROUTES.some((r) =>
    pathname.startsWith(r)
  );

  if (!needsHrAuth && !needsCandidateAuth) {
    return NextResponse.next();
  }

  // Read values from localStorage via cookies or the request
  // Since Next.js middleware runs on the server, we use a cookie to carry the token.
  // The frontend saves it as a cookie named 'hireminds_token' on login.
  const token = request.cookies.get("hireminds_token")?.value;
  const role = request.cookies.get("hireminds_user_role")?.value;

  if (!token) {
    // Not logged in → redirect to login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (needsHrAuth && role !== "hr") {
    // Not an HR user → redirect to candidate portal or login
    return NextResponse.redirect(new URL("/candidate/portal", request.url));
  }

  if (needsCandidateAuth && role !== "candidate") {
    // Not a candidate → redirect to HR dashboard
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Apply middleware to these route patterns only
  matcher: ["/dashboard/:path*", "/jobs/:path*", "/candidate/:path*", "/apply/:path*"],
};
