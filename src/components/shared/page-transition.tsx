"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const DURATION = 0.35;
const EASE = [0.25, 0.46, 0.45, 0.94] as const;

/** Route-specific enter variants so each page feels intentional */
function getVariants(pathname: string) {
  switch (pathname) {
    case "/onboarding":
      return {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: DURATION, ease: EASE },
      };
    case "/ecosystem":
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.25, ease: EASE },
      };
    case "/profile":
      return {
        initial: { opacity: 0, x: -8 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: DURATION, ease: EASE },
      };
    default:
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: DURATION, ease: EASE },
      };
  }
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const variants = getVariants(pathname);

  return (
    <motion.div
      key={pathname}
      initial={variants.initial}
      animate={variants.animate}
      transition={variants.transition}
      className="h-full w-full overflow-hidden"
    >
      {children}
    </motion.div>
  );
}
