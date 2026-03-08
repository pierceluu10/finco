import { auth0, isAuthConfigured } from "@/lib/auth0";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isAuthConfigured()) {
    const session = await auth0.getSession();
    if (!session) {
      redirect("/login");
    }
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-black">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-radial-glow pointer-events-none" />
      <main className="relative flex-1 pl-56">{children}</main>
    </div>
  );
}
