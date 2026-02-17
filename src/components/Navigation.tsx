"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ArrowLeftRight,
  BarChart3,
  Settings,
  TrendingUp,
  Menu,
  X,
} from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { TranslationKey } from "@/lib/i18n";

const navItems: { href: string; labelKey: TranslationKey; icon: typeof LayoutDashboard }[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/transactions", labelKey: "nav.transactions", icon: ArrowLeftRight },
  { href: "/analysis", labelKey: "nav.analysis", icon: BarChart3 },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
];

export function Navigation() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Close on click outside
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <>
      {/* Desktop: top nav */}
      <nav className="sticky top-0 z-50 border-b bg-white/85 dark:bg-gray-950/85 backdrop-blur-xl hidden md:block">
        <div className="container mx-auto px-4">
          <div className="flex h-14 items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-teal-500 text-white shadow-md shadow-blue-600/20 transition-transform group-hover:scale-105">
                <TrendingUp className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold text-gradient">
                {t("common.appName")}
              </span>
            </Link>

            <div className="flex items-center gap-0.5 rounded-lg bg-secondary/60 p-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-white dark:bg-gray-800 text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", isActive && "text-primary")} />
                    <span>{t(item.labelKey)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile: compact top header with hamburger */}
      <nav className="sticky top-0 z-50 border-b bg-white/85 dark:bg-gray-950/85 backdrop-blur-xl md:hidden">
        <div className="flex h-12 items-center justify-between px-4" ref={menuRef}>
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-teal-500 text-white">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
            <span className="text-lg font-bold text-gradient">
              {t("common.appName")}
            </span>
          </Link>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
            aria-label={t("common.toggleMenu")}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Mobile dropdown menu */}
          {menuOpen && (
            <div className="absolute top-full left-0 right-0 border-b bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl shadow-lg animate-fade-in">
              <div className="px-3 py-2 space-y-0.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/8 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                      <span>{t(item.labelKey)}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
