import { AnimatePresence, motion } from 'framer-motion';
import { ReactNode } from 'react';

type OnboardingStep = {
  children: ReactNode;
};

/**
 * An animated container for onboarding steps.
 */
export const AnimatedContent = ({ children }: OnboardingStep) => (
  <AnimatePresence mode="wait">
    <motion.div
      initial={{ opacity: 0, x: 5 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -5 }}
      transition={{ duration: 0.1 }}
    >
      {children}
    </motion.div>
  </AnimatePresence>
);
