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
  },
  events: {
    async signIn({ user, isNewUser }) {
      if (!user.id) return;

      // On first sign-in, claim legacy + anonymous rows
      try {
        if (isNewUser) {
          for (const owner of ["legacy", "anonymous"]) {
            await db
              .update(transactions)
              .set({ userId: user.id })
              .where(eq(transactions.userId, owner));

            await db
              .update(appSettings)
              .set({ userId: user.id })
              .where(eq(appSettings.userId, owner));
          }
        }
      } catch (error) {
        console.error("Failed to claim legacy data:", error);
      }
    },
  },
});
