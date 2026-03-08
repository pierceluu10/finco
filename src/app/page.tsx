"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/landing/hero-section";

export default function LandingPage() {
  return (
    <motion.main
      className="relative min-h-screen bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Navbar />
      <HeroSection />
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <Image
          src="/images/Vector.png"
          alt=""
          width={1920}
          height={660}
          className="w-full object-cover"
          priority
        />
      </div>
    </motion.main>
  );
}
