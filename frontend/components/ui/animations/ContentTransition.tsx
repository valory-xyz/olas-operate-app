import { AnimatePresence, motion } from 'framer-motion';
import { ReactNode, useEffect, useState } from 'react';

export const CONTENT_TRANSITION_DURATION = 0.1;
export const CONTENT_TRANSITION_DELAY_MS = 80;

type ContentTransitionProps = {
  animationKey: string | number;
  children: ReactNode;
  initialY?: number;
  exitY?: number;
  duration?: number;
  ease?: string | number[];
  className?: string;
  style?: React.CSSProperties;
  /** When false, skip the enter animation on first mount. Maps to AnimatePresence `initial`. */
  initialAnimation?: boolean;
};

/**
 * Shared wrapper for simple fade + vertical slide transitions.
 */
export const ContentTransition = ({
  animationKey,
  children,
  initialY = 8,
  exitY = -8,
  duration = CONTENT_TRANSITION_DURATION,
  ease = 'easeOut',
  className,
  style,
  initialAnimation = true,
}: ContentTransitionProps) => {
  return (
    <AnimatePresence mode="wait" initial={initialAnimation}>
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
 * so visual changes can better align with the content transition.
 */
export const useContentTransitionValue = <T,>(
  value: T,
  delayMs: number = CONTENT_TRANSITION_DELAY_MS + 10,
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
