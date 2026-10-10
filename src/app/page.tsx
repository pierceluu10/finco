import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/landing/hero-section";
import styles from "@/components/landing/landing.module.css";

export default function LandingPage() {
  return <main className={styles.landing}><Navbar /><HeroSection /></main>;
}
