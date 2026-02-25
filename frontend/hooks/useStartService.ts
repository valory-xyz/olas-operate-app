import { useCallback } from 'react';

import { MechType } from '@/config/mechs';
import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { AgentType, StakingProgramId } from '@/constants';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { ServicesService } from '@/service/Services';
import { AgentConfig } from '@/types/Agent';
import { Service } from '@/types/Service';
import { updateServiceIfNeeded } from '@/utils/service';

type StartServiceInput = {
  agentType: AgentType;
  agentConfig: AgentConfig;
  service?: Service | null;
  stakingProgramId?: StakingProgramId;
  createServiceIfMissing?: boolean;
  createSafeIfNeeded: () => Promise<void>;
};

/**
 * Start a service for a given agent, optionally creating it if missing.
 * This is shared by manual start and auto-run to avoid duplication.
 */
export const useStartService = () => {
  const startService = useCallback(
    async ({
      agentType,
      agentConfig,
      service,
      stakingProgramId,
      createServiceIfMissing = false,
      createSafeIfNeeded,
    }: StartServiceInput) => {
      // Ensure safe exists before starting or creating service, as it's a prerequisite for both.
      await createSafeIfNeeded();

      // If service exists, ensure it's up to date and start it
      if (service) {
        await updateServiceIfNeeded(service, agentType);
        await ServicesService.startService(service.service_config_id);
        return service;
      }

      // If creating service is not allowed, throw an error since we can't proceed without a service.
      if (!createServiceIfMissing) {
        throw new Error(`Service not found for agent: ${agentType}`);
      }
      if (!stakingProgramId) {
        throw new Error(`Staking program ID required for ${agentType}`);
      }

      // Service template is required to create a new service,
      // so find the appropriate template for the agent type.
      const serviceTemplate = SERVICE_TEMPLATES.find(
        (template) => template.agentType === agentType,
      );
      if (!serviceTemplate) {
        throw new Error(`Service template not found for ${agentType}`);
      }

      // Staking program is required to determine mech type for service creation
      const stakingProgram =
        STAKING_PROGRAMS[agentConfig.evmHomeChainId]?.[stakingProgramId];
      if (!stakingProgram) {
        throw new Error(`Staking program not found for ${agentType}`);
      }

      const serviceToStart = await ServicesService.createService({
        stakingProgramId,
        serviceTemplate,
        deploy: false, // TODO: deprecated will remove
        useMechMarketplace: stakingProgram.mechType === MechType.Marketplace,
      });
      await ServicesService.startService(serviceToStart.service_config_id);
      return serviceToStart;
    },
    [],
  );

  return { startService };
};
