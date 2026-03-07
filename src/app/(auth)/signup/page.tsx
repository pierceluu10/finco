"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FincoLogo } from "@/components/shared/logo";

export default function SignupPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-black">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute inset-0 bg-radial-glow" />

      <motion.div
        className="relative z-10 flex w-full max-w-[420px] flex-col items-center px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Link href="/" className="mb-12">
          <FincoLogo size="lg" />
        </Link>

        <h2 className="mb-2 text-[28px] font-bold tracking-[-0.02em] text-finco-blue">
          Create your account
        </h2>
        <p className="mb-10 text-sm text-white/40">
          Start seeing your financial future
        </p>

        <div className="w-full space-y-4">
          <input
            type="text"
            placeholder="Full name"
            className="h-[52px] w-full rounded-full border border-white/10 bg-white/[0.03] px-6 font-display text-sm text-white placeholder:text-white/30 focus:border-finco-blue/50 focus:outline-none"
          />
          <input
            type="email"
            placeholder="Email address"
            className="h-[52px] w-full rounded-full border border-white/10 bg-white/[0.03] px-6 font-display text-sm text-white placeholder:text-white/30 focus:border-finco-blue/50 focus:outline-none"
          />
          <input
            type="password"
            placeholder="Password"
            className="h-[52px] w-full rounded-full border border-white/10 bg-white/[0.03] px-6 font-display text-sm text-white placeholder:text-white/30 focus:border-finco-blue/50 focus:outline-none"
          />
        </div>

        <Button className="mt-6 w-full" size="lg" asChild>
          <Link href="/ecosystem">Create Account</Link>
        </Button>

        <div className="relative my-8 w-full">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-black px-4 font-display text-xs text-white/30">
              or
            </span>
          </div>
        </div>

        <Button variant="outline" className="w-full" size="lg" asChild>
          <Link href="/ecosystem">Sign up with Google</Link>
        </Button>

        <p className="mt-8 font-display text-sm text-white/40">
          Already have an account?{" "}
          <Link href="/login" className="text-finco-blue hover:underline">
            Sign in
          </Link>
        </p>

        <p className="mt-4 font-display text-[11px] text-white/20">
          Secured by Auth0
        </p>
      </motion.div>
    </main>
  );
}
