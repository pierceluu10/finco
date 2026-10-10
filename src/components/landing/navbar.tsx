import Link from "next/link";
import { FincoLogo } from "@/components/shared/logo";
import styles from "./landing.module.css";

export function Navbar() {
  return <nav className={styles.nav} aria-label="Main navigation">
    <Link href="/" className={styles.logo} aria-label="Finco home"><FincoLogo /></Link>
    <div className={styles.navLinks}><a href="#how-it-works">How it works</a><a href="#your-agents">Meet your agents</a></div>
    <a href="/auth/login?returnTo=/ecosystem" className={styles.login}>Log in</a>
  </nav>;
}
