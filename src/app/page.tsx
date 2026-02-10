import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { TrendingUp, BarChart3, Shield, Moon } from "lucide-react";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-16">
      {/* Hero */}
      <div className="flex flex-col items-center text-center max-w-2xl">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25 mb-6">
          <TrendingUp className="h-8 w-8" />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          TradeTracker
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-lg">
          Track stocks, crypto, deposits, and bonds in one place.
          Real-time prices, portfolio analysis, and beautiful charts.
        </p>

        {/* Sign-in button */}
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="inline-flex items-center gap-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-6 py-3 text-base font-medium shadow-sm hover:shadow-md transition-all hover:scale-[1.02]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google
          </button>
        </form>
      </div>

      {/* Feature highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-16 max-w-4xl w-full">
        {[
          {
            icon: TrendingUp,
            title: "Multi-Asset Tracking",
            desc: "Stocks, crypto, deposits & bonds",
            color: "from-blue-500 to-cyan-500",
          },
          {
            icon: BarChart3,
            title: "Real-Time Prices",
            desc: "Auto-fetched market data",
            color: "from-purple-500 to-pink-500",
          },
          {
            icon: Shield,
            title: "Portfolio Analysis",
            desc: "P&L, allocation & trade insights",
            color: "from-amber-500 to-orange-500",
          },
          {
            icon: Moon,
            title: "Dark Mode",
            desc: "Beautiful light & dark themes",
            color: "from-green-500 to-emerald-500",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-100 dark:border-gray-800"
          >
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} text-white mb-3`}
            >
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="font-semibold mb-1">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
