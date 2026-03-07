"use client";

import Image from "next/image";
import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/landing/hero-section";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen bg-black">
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
    </main>
  );
}
