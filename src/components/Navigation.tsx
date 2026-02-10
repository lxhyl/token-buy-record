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

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/analysis", label: "Analysis", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Navigation() {
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
      <nav className="sticky top-0 z-50 border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl hidden md:block">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25 transition-transform group-hover:scale-105">
                <TrendingUp className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                TradeTracker
              </span>
            </Link>

            <div className="flex items-center gap-1 rounded-2xl bg-secondary/50 p-1.5">
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
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-white dark:bg-gray-800 text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-gray-800/50"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile: compact top header with hamburger */}
      <nav className="sticky top-0 z-50 border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl md:hidden">
        <div className="flex h-12 items-center justify-between px-4" ref={menuRef}>
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 text-white">
              <TrendingUp className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              TradeTracker
            </span>
          </Link>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Mobile dropdown menu */}
          {menuOpen && (
            <div className="absolute top-full left-0 right-0 border-b bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-lg animate-fade-in">
              <div className="px-3 py-2 space-y-1">
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
                        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                      <span>{item.label}</span>
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
