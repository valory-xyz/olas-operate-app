import { useCompleteSetupFromFundingRuns } from '@/hooks/useCompleteSetupFromFundingRuns';

/** Renders nothing; mounted at the app root so setup completes on any screen. */
export const CompleteSetupFromFundingRuns = () => {
  useCompleteSetupFromFundingRuns();
  return null;
};
