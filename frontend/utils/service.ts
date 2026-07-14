import { isEmpty, isEqual } from 'lodash';

import { AgentMap, AgentType, EvmChainId, StakingProgramId } from '@/constants';
import { EnvProvisionMap } from '@/constants/envVariables';
import {
  KPI_DESC_PREFIX,
  SERVICE_TEMPLATES,
} from '@/constants/serviceTemplates';
import { ServicesService } from '@/service/Services';
import {
  Address,
  AgentConfig,
  DeepPartial,
  Maybe,
  MiddlewareServiceResponse,
  Service,
  ServiceTemplate,
} from '@/types';

import { generateAgentName } from './generateAgentName';
import { asEvmChainId } from './middlewareHelpers';

/**
 * Returns the creation timestamp of a service from its hash_history.
 * The smallest key in hash_history represents the first block (creation).
 * Returns Infinity if hash_history is empty or missing.
 */
export const getServiceCreationTime = (
  service: MiddlewareServiceResponse,
): number => {
  const keys = Object.keys(service.hash_history || {}).map(Number);
  return keys.length > 0 ? Math.min(...keys) : Infinity;
};

/** Sort comparator: services created first come first. */
export const sortByCreationTime = (
  a: MiddlewareServiceResponse,
  b: MiddlewareServiceResponse,
): number => getServiceCreationTime(a) - getServiceCreationTime(b);

export const updateServiceIfNeeded = async (
  service: Service,
  agentType: AgentType,
  updatedStakingProgramId?: StakingProgramId,
): Promise<void> => {
  const partialServiceTemplate: DeepPartial<ServiceTemplate> = {};

  const serviceTemplate = SERVICE_TEMPLATES.find(
    (template) =>
      template.name === service.name || template.agentType === agentType,
  );

  if (!serviceTemplate) return;

  // Check if the hash is different
  if (service.hash !== serviceTemplate.hash) {
    partialServiceTemplate.hash = serviceTemplate.hash;
  }

  // Temporary: check if the service has incorrect name
  if (
    serviceTemplate.agentType === AgentMap.AgentsFun &&
    service.name !== serviceTemplate.name
  ) {
    partialServiceTemplate.name = serviceTemplate.name;
  }

  // If the description doesn't include "[Pearl service]" then update it
  if (!service.description.includes(KPI_DESC_PREFIX)) {
    partialServiceTemplate.description = `${KPI_DESC_PREFIX} ${service.description}`;
  }

  // Check if there's a need to update or add env variables
  const envVariablesToUpdate: ServiceTemplate['env_variables'] = {};
  Object.entries(serviceTemplate.env_variables).forEach(
    ([key, templateVariable]) => {
      const serviceEnvVariable = service.env_variables[key];

      // If there's a new variable in the template but it's not in the service
      if (
        !serviceEnvVariable &&
        (templateVariable.provision_type === EnvProvisionMap.FIXED ||
          templateVariable.provision_type === EnvProvisionMap.COMPUTED)
      ) {
        envVariablesToUpdate[key] = templateVariable;
      }

      // If the variable exist in the service and was just updated in the template
      if (
        serviceEnvVariable &&
        serviceEnvVariable.value !== templateVariable.value &&
        templateVariable.provision_type === EnvProvisionMap.FIXED
      ) {
        envVariablesToUpdate[key] = templateVariable;
      }
    },
  );

  // Detect env vars present on the service but no longer in the template.
  // PATCH merges env_variables and cannot remove keys — handle these via PUT below.
  const hasStaleEnvVariables = Object.keys(service.env_variables).some(
    (key) => !(key in serviceTemplate.env_variables),
  );

  // When a PUT replacement is needed, skip env_variables in the PATCH body —
  // the PUT below sends the full template set, which subsumes additions/updates.
  if (!isEmpty(envVariablesToUpdate) && !hasStaleEnvVariables) {
    partialServiceTemplate.env_variables = envVariablesToUpdate;
  }

  // Check if fund_requirements were updated
  const serviceHomeChain = service.home_chain;
  const serviceHomeChainFundRequirements =
    service.chain_configs[serviceHomeChain].chain_data.user_params
      .fund_requirements;
  const templateFundRequirements =
    serviceTemplate.configurations[serviceHomeChain]?.fund_requirements;

  if (
    Object.entries(serviceHomeChainFundRequirements).some(([key, item]) => {
      return (
        templateFundRequirements?.[key as Address]?.agent !== item.agent ||
        templateFundRequirements?.[key as Address]?.safe !== item.safe
      );
    })
  ) {
    // Need to pass all fund requirements from the template
    // even if some of them were updated
    partialServiceTemplate.configurations = {
      [serviceHomeChain]: { fund_requirements: templateFundRequirements },
    };
  }

  // Check if the agent release was updated
  if (!isEqual(service.agent_release, serviceTemplate.agent_release)) {
    partialServiceTemplate.agent_release = serviceTemplate.agent_release;
  }

  // If staking program is updated
  if (updatedStakingProgramId) {
    partialServiceTemplate.configurations = {
      ...partialServiceTemplate.configurations,
      [serviceHomeChain]: {
        ...partialServiceTemplate.configurations?.[serviceHomeChain],
        staking_program_id: updatedStakingProgramId,
      },
    };
  }

  if (!isEmpty(partialServiceTemplate)) {
    await ServicesService.updateService({
      serviceConfigId: service.service_config_id,
      partialServiceTemplate,
    });
  }

  if (hasStaleEnvVariables) {
    await ServicesService.putService({
      serviceConfigId: service.service_config_id,
      partialServiceTemplate: {
        env_variables: serviceTemplate.env_variables,
      },
    });
  }
};

export const onDummyServiceCreation = async (
  stakingProgramId: StakingProgramId,
  serviceTemplateConfig: ServiceTemplate,
) => {
  return ServicesService.createService({
    serviceTemplate: serviceTemplateConfig,
    deploy: true,
    stakingProgramId,
  });
};

/**
 * Check if the token is a valid service id
 */
export const isValidServiceId = (
  token: number | null | undefined | -1,
): token is number => {
  return typeof token === 'number' && token !== -1 && token !== 0;
};

/**
 * Checks if a service belongs to a given agent config (the shared agent matcher).
 *
 * Multi-chain agents (`config.supportedChains` present, e.g. Connect) match any
 * instance sharing the `servicePublicId` whose `home_chain` is one of the
 * supported chains. Single-chain agents keep the original strict `home_chain`
 * equality, so their grouping/naming behaviour is unchanged.
 */
export const matchesAgentConfig = (
  service: Service | MiddlewareServiceResponse,
  config: AgentConfig,
): boolean => {
  if (service.service_public_id !== config.servicePublicId) return false;

  if (config.supportedChains) {
    return config.supportedChains.includes(asEvmChainId(service.home_chain));
  }

  return service.home_chain === config.middlewareHomeChainId;
};

/**
 * @deprecated Alias of {@link matchesAgentConfig}, kept for existing callers.
 */
export const isServiceOfAgent = matchesAgentConfig;

/**
 * Resolves the EVM chain a service instance runs on for a given agent config.
 *
 * Multi-chain agents (`config.supportedChains`) resolve the chain per-instance
 * from `service.home_chain`; single-chain agents use the static
 * `config.evmHomeChainId`, so their behaviour is unchanged.
 */
export const getServiceEvmChainId = (
  service: Maybe<Service | MiddlewareServiceResponse>,
  config: AgentConfig,
): EvmChainId => {
  if (config.supportedChains && service?.home_chain) {
    return asEvmChainId(service.home_chain);
  }
  return config.evmHomeChainId;
};

/**
 * Get display name for a service instance.
 * Falls back to "My `agentName`" if the instance isn't deployed yet.
 */
export const getServiceInstanceName = (
  service: Maybe<Service>,
  displayName: string,
  evmHomeChainId: EvmChainId,
): string => {
  const homeChain = service?.home_chain;
  const tokenId = homeChain
    ? service?.chain_configs[homeChain]?.chain_data?.token
    : undefined;

  if (isValidServiceId(tokenId)) {
    return generateAgentName(evmHomeChainId, tokenId);
  }

  return `My ${displayName}`;
};
