import { AnimatePresence, motion } from 'framer-motion';
import { ReactNode, useEffect, useState } from 'react';

export const PAGE_TRANSITION_DURATION = 0.1;
export const PAGE_TRANSITION_DELAY_MS = 80;

type PageTransitionProps = {
  animationKey: string | number;
  children: ReactNode;
  initialY?: number;
  exitY?: number;
  duration?: number;
  ease?: string | number[];
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Shared wrapper for simple fade + vertical slide transitions.
 */
export const PageTransition = ({
  animationKey,
  children,
  initialY = 8,
  exitY = -8,
  duration = PAGE_TRANSITION_DURATION,
  ease = 'easeOut',
  className,
  style,
}: PageTransitionProps) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={animationKey}
        className={className}
        style={style}
        initial={{ opacity: 0, y: initialY }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: exitY }}
        transition={{ duration, ease }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Returns a value that is updated with a small delay,
 * so visual changes can better align with the page transition.
 */
export const usePageTransitionValue = <T,>(
  value: T,
  delayMs: number = PAGE_TRANSITION_DELAY_MS,
) => {
  const [delayedValue, setDelayedValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDelayedValue(value);
    }, delayMs);

    return () => clearTimeout(timeoutId);
  }, [value, delayMs]);

  return delayedValue;
};
