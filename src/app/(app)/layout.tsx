export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-screen overflow-hidden bg-black">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-radial-glow pointer-events-none" />
      <main className="relative flex-1 pl-56">{children}</main>
    </div>
  );
}
