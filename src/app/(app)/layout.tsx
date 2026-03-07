export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <main className="flex-1">{children}</main>
    </div>
  );
}
