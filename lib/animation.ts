'use client';

import { useEffect, useRef, useState } from 'react';

const REDUCED_MOTION = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Animate a number from 0 to `target` over `duration` ms.
 * Uses an easeOutQuart curve — fast at first, settles at the end. The Stocks-app feel.
 * Respects prefers-reduced-motion: returns the target value immediately.
 */
export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(() => (REDUCED_MOTION ? target : 0));
  const rafRef = useRef<number | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (REDUCED_MOTION) {
      setValue(target);
      return;
    }
    // Only animate on first mount. Subsequent target changes snap.
    if (startedRef.current) {
      setValue(target);
      return;
    }
    startedRef.current = true;

    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      // easeOutQuart
      const eased = 1 - Math.pow(1 - t, 4);
      setValue(target * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
}

/**
 * Returns true after a single requestAnimationFrame tick — useful for
 * triggering CSS `transition` animations on mount (e.g. growing a bar
 * from width:0 to its real width).
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (REDUCED_MOTION) {
      setMounted(true);
      return;
    }
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return mounted;
}
