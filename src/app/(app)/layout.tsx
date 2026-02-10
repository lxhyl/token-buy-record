import { SessionProvider } from "next-auth/react";
import { Navigation } from "@/components/Navigation";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <Navigation />
      <main className="container mx-auto px-4 py-6 md:py-8 pb-24 md:pb-8">
        {children}
      </main>
    </SessionProvider>
  );
}
