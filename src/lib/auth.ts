import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users, accounts, transactions, appSettings } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
  }),
  providers: [Google],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
    authorized({ auth: session, request }) {
      const { pathname } = request.nextUrl;

      // Public routes
      if (
        pathname === "/" ||
        pathname.startsWith("/api/auth")
      ) {
        return true;
      }

      // Everything else requires auth
      return !!session?.user;
    },
  },
  events: {
    async signIn({ user, isNewUser }) {
      if (!user.id) return;

      // On first sign-in, claim all legacy rows
      try {
        if (isNewUser) {
          await db
            .update(transactions)
            .set({ userId: user.id })
            .where(eq(transactions.userId, "legacy"));

          await db
            .update(appSettings)
            .set({ userId: user.id })
            .where(eq(appSettings.userId, "legacy"));
        }
      } catch (error) {
        console.error("Failed to claim legacy data:", error);
      }
    },
  },
});
