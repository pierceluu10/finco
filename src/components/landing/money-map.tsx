"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Banknote, Check, Landmark } from "lucide-react";
import styles from "./landing.module.css";

const MONTHLY_INCOME = 8500;
const MONTHLY_SPENDING = 4107;
const PLANNED_SAVINGS = 800;
const EXTRA_SAVINGS = 200;
const MONTHS_PER_YEAR = 12;
const CURRENCY = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

export function MoneyMap() {
  const [saveMore, setSaveMore] = useState(false);
  const savings = PLANNED_SAVINGS + (saveMore ? EXTRA_SAVINGS : 0);
  const remaining = MONTHLY_INCOME - MONTHLY_SPENDING - savings;
  return <div className={styles.map} aria-label="Interactive example of a monthly money flow">
    <div className={styles.mapHeader}><span>Your money, connected</span><span className={styles.demoTag}>Illustrative demo</span></div>
    <div className={styles.mapCanvas}>
      <svg className={styles.connections} viewBox="0 0 620 380" preserveAspectRatio="none" aria-hidden="true">
        <path d="M130 185 H245 Q265 185 265 165 V100 Q265 80 285 80 H410" /><path d="M130 185 H410" /><path d="M130 185 H245 Q265 185 265 205 V290 Q265 310 285 310 H410" /><circle cx="265" cy="185" r="6" />
      </svg>
      <div className={styles.incomeNode}><span className={styles.nodeIcon}><Banknote size={24} aria-hidden="true" /></span><span>Monthly income</span><strong>{CURRENCY.format(MONTHLY_INCOME)}</strong><small>After tax</small></div>
      <div className={styles.accountNode}><Landmark size={26} aria-hidden="true" /><span>Chequing</span></div>
      <div className={`${styles.destination} ${styles.spendingNode}`}><ArrowUpRight size={19} aria-hidden="true" /><div><span>Everyday spending</span><strong>{CURRENCY.format(MONTHLY_SPENDING)}</strong></div></div>
      <div className={`${styles.destination} ${styles.savingNode}`}><ArrowDownLeft size={19} aria-hidden="true" /><div><span>Savings & investing</span><strong>{CURRENCY.format(savings)}</strong></div><span className={styles.routeDot} /></div>
      <div className={`${styles.destination} ${styles.remainingNode}`}><Check size={19} aria-hidden="true" /><div><span>Room to breathe</span><strong>{CURRENCY.format(remaining)}</strong></div></div>
    </div>
    <div className={styles.mapControl}><div><strong>What if you saved a little more?</strong><span>Try a change. See where it goes.</span></div><button type="button" aria-pressed={saveMore} onClick={() => setSaveMore(!saveMore)}>{saveMore ? <Check size={16} aria-hidden="true" /> : "+"} Save another {CURRENCY.format(EXTRA_SAVINGS)}</button></div>
    <p className={styles.mapResult} aria-live="polite">{saveMore ? `${CURRENCY.format(EXTRA_SAVINGS * MONTHS_PER_YEAR)} more toward your future over a year, with ${CURRENCY.format(remaining)} left each month.` : "A small decision can change the bigger picture."}</p>
  </div>;
}
