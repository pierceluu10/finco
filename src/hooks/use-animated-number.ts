"use client";

import { useRef, useState, useEffect } from "react";

export function useAnimatedNumber(target: number, duration = 600): number {
  const [display, setDisplay] = useState(target);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;

    const animate = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (target - from) * eased;
      setDisplay(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        fromRef.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  useEffect(() => {
    fromRef.current = display;
  // only capture display when target changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return display;
}
