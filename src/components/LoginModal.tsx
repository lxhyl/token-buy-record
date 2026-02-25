"use client";

import { useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { TrendingUp, X, Mail, ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

export function LoginModal({ open, onClose }: LoginModalProps) {
  const { t, tInterpolate } = useI18n();
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setEmail("");
      setEmailStatus("idle");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || emailStatus !== "idle") return;
    setEmailStatus("sending");
    await signIn("resend", { email, callbackUrl: "/dashboard", redirect: false });
    setEmailStatus("sent");
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border bg-background shadow-2xl shadow-black/20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="px-8 pt-8 pb-6 text-center border-b bg-gradient-to-b from-blue-50/60 to-transparent dark:from-blue-950/20">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-teal-500 text-white shadow-lg shadow-blue-600/25 mb-4">
            <TrendingUp className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">TradeTracker</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("landing.heroTitle1")} {t("landing.heroTitle2")}
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-7 space-y-4">
          {/* Google */}
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="w-full flex items-center justify-center gap-3 rounded-xl border-2 border-border bg-background px-4 py-3 text-sm font-semibold transition-all hover:border-primary/30 hover:bg-secondary/50 hover:shadow-sm active:scale-[0.99]"
          >
            <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {t("common.signInWithGoogle")}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">{t("common.orDivider")}</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Email magic link */}
          {emailStatus === "sent" ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-6 py-5 text-center">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{t("common.checkEmail")}</p>
                <p className="text-xs text-muted-foreground mt-1">{tInterpolate("common.magicLinkSent", { email })}</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  ref={inputRef}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("common.emailPlaceholder")}
                  className="w-full rounded-xl border-2 border-input bg-background pl-10 pr-4 py-3 text-sm outline-none transition-all hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:[color-scheme:dark]"
                />
              </div>
              <button
                type="submit"
                disabled={emailStatus === "sending" || !email}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-teal-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition-all hover:shadow-md hover:shadow-blue-600/25 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {emailStatus === "sending" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("common.sending")}
                  </>
                ) : (
                  <>
                    {t("common.sendMagicLink")}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 text-center">
          <p className="text-xs text-muted-foreground">
            {t("landing.footer")}
          </p>
        </div>
      </div>
    </div>
  );
}
