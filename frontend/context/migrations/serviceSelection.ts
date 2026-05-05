import { AGENT_CONFIG } from '@/config/agents';
import { AgentType } from '@/constants';
import { MiddlewareServiceResponse, Nullable } from '@/types';

type MigrationResult = {
  serviceConfigId: Nullable<string>;
  shouldPersist: boolean;
};

/**
 * Resolves which service_config_id should be selected, handling:
 * 1. Keeping a valid current selection
 * 2. One-time migration from legacy lastSelectedAgentType
 * 3. Fallback to the first available service
 */
export const resolveSelectedServiceConfigId = ({
  services,
  currentServiceConfigId,
  legacyAgentType,
  hasMigrated,
}: {
  services: MiddlewareServiceResponse[];
  currentServiceConfigId: Nullable<string>;
  legacyAgentType?: AgentType;
  hasMigrated: boolean;
}): MigrationResult & { migrated: boolean } => {
  if (
    currentServiceConfigId &&
    services.some(
      (service) => service.service_config_id === currentServiceConfigId,
    )
  ) {
    return {
      serviceConfigId: currentServiceConfigId,
      shouldPersist: false,
      migrated: false,
    };
  }

  // Migrate from lastSelectedAgentType, selects the first instance of the agent type
  if (!hasMigrated && legacyAgentType) {
    const config = AGENT_CONFIG[legacyAgentType];
    if (config) {
      const matchingService = services.find(
        (service) =>
          service.service_public_id === config.servicePublicId &&
          service.home_chain === config.middlewareHomeChainId,
      );
      if (matchingService) {
        return {
          serviceConfigId: matchingService.service_config_id,
          shouldPersist: true,
          migrated: true,
        };
      }
    }
  }

  const firstService = services[0];
  return {
    serviceConfigId: firstService?.service_config_id ?? null,
    shouldPersist: !!firstService,
    migrated: false,
  };
};
