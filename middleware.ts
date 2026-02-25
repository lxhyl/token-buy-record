export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    // Protect everything except static assets, API auth routes, public API routes, and the landing page
    "/((?!_next|icons|manifest\\.json|sw\\.js|favicon\\.ico|api/auth|api/logo|api/landing-prices).*)",
  ],
};
