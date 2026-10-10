import { ArrowUpRight, Check, GitBranch, ScanLine, SlidersHorizontal } from "lucide-react";
import { MoneyMap } from "./money-map";
import styles from "./landing.module.css";

const SIGNUP_PATH = "/auth/login?screen_hint=signup&returnTo=/onboarding";
const AGENTS = [
  { name: "Sentinel", job: "See the pressure points.", description: "Spot unusual spending and understand what is putting pressure on your finances.", icon: ScanLine },
  { name: "Simulator", job: "Try a different tomorrow.", description: "Explore a new expense, a change in income, or another savings contribution before you commit.", icon: SlidersHorizontal },
  { name: "Planner", job: "Make room for what matters.", description: "Turn your emergency fund, debt payoff, and investing goals into a plan you can follow.", icon: GitBranch },
];

export function HeroSection() {
  return <>
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.heroCopy}>
        <h1 id="hero-title">Give your money a direction.</h1>
        <p>Income. Everyday spending. Your next big thing. See how it all connects, and find a way forward with Finco.</p>
        <div className={styles.actions}>
          <a href={SIGNUP_PATH} className={styles.primary}>Build your ecosystem <ArrowUpRight size={19} aria-hidden="true" /></a>
          <a href="/ecosystem" className={styles.secondary}>Explore the demo</a>
        </div>
        <p className={styles.heroNote}><Check size={16} aria-hidden="true" /> Your whole financial picture, in one place.</p>
      </div><MoneyMap />
    </section>
    <section className={styles.intro} id="how-it-works" aria-labelledby="intro-title">
      <h2 id="intro-title">The numbers are only<br />half the picture.</h2>
      <div><p>Finco connects the dots between what comes in, what goes out, and what you want to build. A living map makes the relationships visible.</p>
        <p>Start with your financial profile or import transactions from a CSV. Then explore your accounts, follow the flow, and see what changes when life does.</p>
        <a href="/ecosystem" className={styles.textLink}>Take a look inside <ArrowUpRight size={19} aria-hidden="true" /></a>
      </div>
    </section>
    <section className={styles.agents} id="your-agents" aria-labelledby="agents-title">
      <div className={styles.sectionHeading}><h2 id="agents-title">Three agents.<br />One clearer picture.</h2><p>Different perspectives on the same financial ecosystem. The math stays deterministic; the agents help you understand it.</p></div>
      <div className={styles.agentList}>{AGENTS.map(({ name, job, description, icon: Icon }) => <article key={name} className={styles.agent}>
        <Icon size={27} strokeWidth={1.5} aria-hidden="true" /><h3>{name}</h3><strong>{job}</strong><p>{description}</p>
      </article>)}</div>
    </section>
    <section className={styles.close} aria-labelledby="close-title"><h2 id="close-title">Your money.<br />A little more understood.</h2><a href={SIGNUP_PATH} className={styles.primary}>Get started with Finco <ArrowUpRight size={19} aria-hidden="true" /></a></section>
    <footer className={styles.footer}><span>Finco</span><p>A connected view of your financial life.</p><a href="/ecosystem">Explore Finco</a></footer>
  </>;
}
