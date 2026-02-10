import { auth } from "@/lib/auth";

/** Returns the authenticated userId, or "anonymous" if not signed in. */
export async function getUserId(): Promise<string> {
  const session = await auth();
  return session?.user?.id ?? "anonymous";
}

export async function getOptionalUser() {
  const session = await auth();
  return session?.user ?? null;
}
