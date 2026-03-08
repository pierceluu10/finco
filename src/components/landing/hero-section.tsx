"use client";

import { motion } from "framer-motion";
import Link from "next/link";

function FloatingShareNode({
  x,
  y,
  size = 18,
  delay = 0,
  rotation = 0,
}: {
  x: string;
  y: string;
  size?: number;
  delay?: number;
  rotation?: number;
}) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="absolute"
      style={{ left: x, top: y }}
      initial={{ opacity: 0, rotate: rotation, scale: 0.7 }}
      animate={{
        opacity: [0.25, 0.55, 0.25],
        y: [0, -6, 0],
        rotate: [rotation, rotation + 8, rotation],
        scale: [0.9, 1, 0.9],
      }}
      transition={{
        duration: 6 + delay * 0.8,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
    >
      <path
        fill="#7F7FFA"
        d="M17.5 3a3.5 3.5 0 0 0-3.456 4.06L8.143 9.704a3.5 3.5 0 1 0-.01 4.6l5.91 2.65a3.5 3.5 0 1 0 .863-1.805l-5.94-2.662a3.5 3.5 0 0 0 .002-.961l5.948-2.667A3.5 3.5 0 1 0 17.5 3"
      />
    </motion.svg>
  );
}

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="absolute inset-0 bg-radial-glow" />

      <FloatingShareNode x="6%" y="14%" delay={0} rotation={-20} size={20} />
      <FloatingShareNode x="20%" y="26%" delay={1.5} rotation={45} size={14} />
      <FloatingShareNode x="50%" y="50%" delay={0.8} rotation={-10} size={12} />
      <FloatingShareNode x="72%" y="18%" delay={0.3} rotation={-70} size={16} />
      <FloatingShareNode x="90%" y="38%" delay={2.2} rotation={20} size={24} />
      <FloatingShareNode x="8%" y="68%" delay={1} rotation={-130} size={18} />
      <FloatingShareNode x="82%" y="62%" delay={1.8} rotation={60} size={14} />
      <FloatingShareNode x="40%" y="80%" delay={2.5} rotation={-40} size={16} />
      <FloatingShareNode x="60%" y="85%" delay={0.5} rotation={30} size={20} />

      <div className="relative z-10 mx-auto max-w-[921px] px-6 text-center">
        <motion.p
          className="mb-2 font-sans text-[22px] font-bold tracking-[-0.018em] text-finco-blue"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Welcome to Finco
        </motion.p>

        <motion.h1
          className="mb-4 font-sans text-[64px] font-bold leading-[74px] tracking-[-0.01em] text-finco-blue"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          Your Financial Ecosystem.
        </motion.h1>

        <motion.p
          className="mb-10 font-sans text-[18px] font-normal leading-relaxed tracking-[-0.01em] text-finco-blue/60"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          Visualize where your money comes from and where it goes
        </motion.p>

        <motion.div
          className="flex items-center justify-center gap-7"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <motion.div
            whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(127,127,250,0.15)" }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="rounded-full"
          >
            <Link
              href="/ecosystem"
              className="inline-flex h-[49px] w-[196px] items-center justify-center rounded-full border-[1.4px] border-finco-blue font-sans text-[16px] font-bold text-finco-blue transition-colors hover:bg-finco-blue/10"
            >
              Visit Ecosystem
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.85 }}
            whileHover={{ scale: 1.05, boxShadow: "0 0 24px rgba(127,127,250,0.3)" }}
            whileTap={{ scale: 0.97 }}
            className="rounded-full"
          >
            <a
              href="/auth/login?screen_hint=signup&returnTo=/onboarding"
              className="inline-flex h-[49px] items-center justify-center gap-2 rounded-full bg-finco-blue px-[34px] font-sans text-[16px] font-bold text-black transition-colors hover:bg-finco-blue/90"
            >
              Get Started
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.5 10.5L10.5 3.5M10.5 3.5H4.5M10.5 3.5V9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
