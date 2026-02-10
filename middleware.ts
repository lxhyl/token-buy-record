export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    "/((?!_next|icons|manifest\\.json|sw\\.js|favicon\\.ico).*)",
  ],
};
