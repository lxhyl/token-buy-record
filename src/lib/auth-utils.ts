import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function getRequiredUser(): Promise<string> {
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
