import { useOnboardingSurveyTiming } from '@/hooks/useOnboardingSurveyTiming';

/** Renders nothing; exists so the classification runs once at the app root. */
export const OnboardingSurveyTimingClassifier = () => {
  useOnboardingSurveyTiming();
  return null;
};
