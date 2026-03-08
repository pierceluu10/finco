"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 px-4"
      style={{ background: "hsl(240 10% 3.9%)" }}
    >
      <h1 className="font-sans text-xl font-bold text-[#e8e8ff]">Something went wrong</h1>
      <p className="font-sans text-sm text-[#6b6b9a] text-center max-w-md">
        {error.message || "An unexpected error occurred."}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-[#7F7FFA] px-5 py-2.5 font-sans text-sm font-bold text-black hover:bg-[#7F7FFA]/90"
        >
          Try again
        </button>
        <Link
          href="/ecosystem"
          className="rounded-full border border-[#1a1a2e] px-5 py-2.5 font-sans text-sm font-medium text-[#e8e8ff] hover:bg-white/5"
        >
          Open ecosystem
        </Link>
      </div>
    </div>
  );
}
