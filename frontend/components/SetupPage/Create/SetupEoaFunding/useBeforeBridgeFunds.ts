import { useCallback } from 'react';

import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { useServices } from '@/hooks/useServices';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { onDummyServiceCreation } from '@/utils/service';

/**
 * Hook to run actions before bridging funds screen.
 * For predict agent, it creates a dummy service & then navigates to the bridge onboarding.
 */
export const useBeforeBridgeFunds = () => {
  const { defaultStakingProgramId } = useStakingProgram();
  const {
    selectedAgentType,
    selectedService,
    refetch: refetchServices,
  } = useServices();

  const serviceTemplate = SERVICE_TEMPLATES.find(
    (template) => template.agentType === selectedAgentType,
  );

  return useCallback(async () => {
    // If a service is already selected, do not create a service
    if (selectedService) return;

    if (!defaultStakingProgramId) {
      throw new Error('Default staking program ID unavailable');
    }

    if (!serviceTemplate) {
      throw new Error('Service template unavailable');
    }

    await onDummyServiceCreation(defaultStakingProgramId, serviceTemplate);

    // fetch services again to update the state after service creation
    await refetchServices?.();

    // For other agents, just navigate to bridge onboarding as
    // service creation is already handled in the agent setup.
  }, [
    defaultStakingProgramId,
    serviceTemplate,
    selectedService,
    refetchServices,
  ]);
};
