import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users, accounts, verificationTokens, transactions, appSettings } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google,
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.AUTH_EMAIL_FROM ?? "TradeTracker <noreply@resend.dev>",
      async sendVerificationRequest({ identifier: email, url, provider }) {
        const { Resend: ResendClient } = await import("resend");
        const client = new ResendClient(provider.apiKey);
        const fromAddress = typeof provider.from === "string" ? provider.from : "TradeTracker <noreply@resend.dev>";
        await client.emails.send({
          from: fromAddress,
          to: [email],
          subject: "Sign in to TradeTracker",
          text: `Sign in to TradeTracker\n\nClick the link below to sign in. This link expires in 24 hours and can only be used once.\n\n${url}\n\nIf you did not request this email, you can safely ignore it.\n\n— TradeTracker`,
          html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign in to TradeTracker</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;max-width:560px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb,#0d9488);padding:32px 40px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <div style="width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:10px;display:inline-flex;align-items:center;justify-content:center;">
                  <span style="color:#fff;font-size:20px;font-weight:700;">T</span>
                </div>
                <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">TradeTracker</span>
              </div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Sign in to your account</h1>
              <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.6;">
                Click the button below to sign in. This link will expire in <strong>24 hours</strong> and can only be used once.
              </p>
              <div style="text-align:center;margin:0 0 28px;">
                <a href="${url}"
                   style="display:inline-block;background:linear-gradient(135deg,#2563eb,#0d9488);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;letter-spacing:0.1px;">
                  Sign in to TradeTracker →
                </a>
              </div>
              <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
                Or copy and paste this URL into your browser:<br/>
                <a href="${url}" style="color:#2563eb;word-break:break-all;font-size:12px;">${url}</a>
              </p>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #f1f5f9;margin:0;" /></td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                You received this email because a sign-in was requested for <strong>${email}</strong>.<br/>
                If you did not request this, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;">© 2025 TradeTracker · Personal portfolio tracking</p>
      </td>
    </tr>
  </table>
</body>
</html>`,
        });
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
  },
  callbacks: {
    authorized({ auth: session, request: { nextUrl } }) {
      const isLoggedIn = !!session?.user;
      const isLanding = nextUrl.pathname === "/";
      if (isLanding) return true; // always allow landing page
      if (!isLoggedIn) return false; // redirect to signIn page (/)
      return true;
    },
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
