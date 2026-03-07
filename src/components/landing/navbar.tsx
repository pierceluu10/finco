"use client";

import Link from "next/link";
import { FincoLogo } from "@/components/shared/logo";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.2] backdrop-blur-[142px]" style={{ background: "rgba(5, 5, 5, 0.01)" }}>
      <div className="mx-auto flex h-[84px] max-w-[1920px] items-center justify-between px-8">
        <div className="w-[80px]" />
        <Link href="/">
          <FincoLogo size="lg" />
        </Link>
        <div className="flex w-[80px] justify-end">
          <Link
            href="/login"
            className="inline-flex h-[40px] items-center justify-center rounded-full bg-finco-blue px-6 text-sm font-bold text-black transition-colors hover:bg-finco-blue/90"
          >
            Login
          </Link>
        </div>
      </div>
    </nav>
  );
}
