import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

/** Returns the authenticated userId, or redirects to landing page. */
export async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }
  return session.user.id;
}

export async function getOptionalUser() {
  const session = await auth();
  return session?.user ?? null;
}
