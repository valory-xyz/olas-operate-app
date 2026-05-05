import { ACTIVE_AGENTS } from '@/config/agents';
import { MiddlewareServiceResponse } from '@/types';
import { PearlStore } from '@/types/ElectronApi';

type IsInitialFundedWrite = {
  storeKey: string;
  value: unknown;
};

/**
 * Helper function for migrating legacy `isInitialFunded: boolean`
 * to `isInitialFunded: { [serviceConfigId]: boolean }`.
 *
 * Preserves the original boolean in `isInitialFundedLegacy` for rollback safety.
 * Returns the list of store writes to perform (empty if nothing to migrate).
 */
export const migrateIsInitialFunded = ({
  storeState,
  services,
}: {
  storeState: PearlStore;
  services: MiddlewareServiceResponse[];
}): IsInitialFundedWrite[] => {
  const writes: IsInitialFundedWrite[] = [];

  for (const [agentType, config] of ACTIVE_AGENTS) {
    const agentSettings = storeState[agentType];
    if (!agentSettings) continue;

    const { isInitialFunded } = agentSettings;

    // if already migrated
    if (typeof isInitialFunded !== 'boolean') continue;

    // Save original boolean for rollback safety
    writes.push({
      storeKey: `${agentType}.isInitialFundedLegacy`,
      value: isInitialFunded,
    });

    const firstMatchingService = services.find(
      (service) =>
        service.service_public_id === config.servicePublicId &&
        service.home_chain === config.middlewareHomeChainId,
    );

    if (firstMatchingService) {
      writes.push({
        storeKey: `${agentType}.isInitialFunded`,
        value: { [firstMatchingService.service_config_id]: isInitialFunded },
      });
    } else {
      writes.push({
        storeKey: `${agentType}.isInitialFunded`,
        value: {},
      });
    }
  }

  return writes;
};
