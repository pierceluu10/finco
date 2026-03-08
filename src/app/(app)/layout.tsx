import { auth0, isAuthConfigured } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { PageTransition } from "@/components/shared/page-transition";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isAuthConfigured()) {
    try {
      const session = await auth0.getSession();
      if (!session) {
        redirect("/login");
      }
    } catch {
      // If getSession fails (e.g. misconfiguration, cookie issues), still render so onboarding/ecosystem can show
    }
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-black" style={{ background: "hsl(240 10% 3.9%)" }}>
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-radial-glow pointer-events-none" />
      <main className="relative flex-1 min-w-0">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
