import { isEmpty, isEqual } from 'lodash';

import { AgentMap, AgentType, StakingProgramId } from '@/constants';
import { EnvProvisionMap } from '@/constants/envVariables';
import {
  KPI_DESC_PREFIX,
  SERVICE_TEMPLATES,
} from '@/constants/serviceTemplates';
import { ServicesService } from '@/service/Services';
import { Address, DeepPartial, Service, ServiceTemplate } from '@/types';

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

  if (!isEmpty(envVariablesToUpdate)) {
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

  if (isEmpty(partialServiceTemplate)) return;

  await ServicesService.updateService({
    serviceConfigId: service.service_config_id,
    partialServiceTemplate,
  });
};

export const onDummyServiceCreation = async (
  stakingProgramId: StakingProgramId,
  serviceTemplateConfig: ServiceTemplate,
) => {
  await ServicesService.createService({
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
