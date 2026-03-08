"use client";

import { useRef, useState, useEffect } from "react";

/**
 * Animates a number from current to target over duration using requestAnimationFrame.
 * Stores raf id in a ref so it does not trigger parent re-renders.
 * Only runs when targetValue changes.
 */
export function useCountUp(
  targetValue: number,
  durationMs: number = 600,
  enabled: boolean = true
): number {
  const [displayValue, setDisplayValue] = useState(targetValue);
  const rafIdRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const fromRef = useRef<number>(targetValue);

  useEffect(() => {
    if (!enabled) {
      setDisplayValue(targetValue);
      fromRef.current = targetValue;
      return;
    }
    const from = fromRef.current;
    if (from === targetValue) return;

    startRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const t = Math.min(elapsed / durationMs, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const value = from + (targetValue - from) * eased;
      setDisplayValue(value);
      if (t < 1) {
        rafIdRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = targetValue;
      }
    };

    rafIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [targetValue, durationMs, enabled]);

  return displayValue;
}
