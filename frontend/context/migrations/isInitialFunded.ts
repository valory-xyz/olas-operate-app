import { ACTIVE_AGENTS } from '@/config/agents';
import { AgentType } from '@/constants';
import { MiddlewareServiceResponse } from '@/types';
import { ElectronStore } from '@/types/ElectronApi';

type IsInitialFundedWrite = {
  agentType: AgentType;
  storeKey: string;
  value: Record<string, boolean>;
};

/**
 * Helper function for migrating legacy `isInitialFunded: boolean`
 * to `isInitialFunded: { [serviceConfigId]: boolean }`.
 *
 * Returns the list of store writes to perform (empty if nothing to migrate).
 */
export const migrateIsInitialFunded = ({
  storeState,
  services,
}: {
  storeState: ElectronStore;
  services: MiddlewareServiceResponse[];
}): IsInitialFundedWrite[] => {
  const writes: IsInitialFundedWrite[] = [];

  for (const [agentType, config] of ACTIVE_AGENTS) {
    const agentSettings = storeState[agentType];
    if (!agentSettings) continue;

    const { isInitialFunded } = agentSettings;

    // if already migrated
    if (typeof isInitialFunded !== 'boolean') continue;

    const firstMatchingService = services.find(
      (service) =>
        service.service_public_id === config.servicePublicId &&
        service.home_chain === config.middlewareHomeChainId,
    );

    if (firstMatchingService) {
      writes.push({
        agentType,
        storeKey: `${agentType}.isInitialFunded`,
        value: { [firstMatchingService.service_config_id]: isInitialFunded },
      });
    } else {
      writes.push({
        agentType,
        storeKey: `${agentType}.isInitialFunded`,
        value: {},
      });
    }
  }

  return writes;
};
