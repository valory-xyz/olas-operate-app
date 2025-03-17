import { isEmpty, isNil } from 'lodash';

import { EnvProvisionType, ServiceTemplate } from '@/client';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { AgentType } from '@/enums/Agent';
import { ServicesService } from '@/service/Services';
import { Service } from '@/types/Service';
import { DeepPartial } from '@/types/Util';

export const updateServiceIfNeeded = async (
  service: Service,
  agentType: AgentType,
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

  // Temporary: check if the service has the default description
  if (
    serviceTemplate.agentType === AgentType.Memeooorr &&
    service.description === serviceTemplate.description
  ) {
    const xUsername = service.env_variables?.TWIKIT_USERNAME?.value;
    if (xUsername) {
      partialServiceTemplate.description = `Memeooorr @${xUsername}`;
    }
  }

  // Temporary: check if the service has incorrect name
  if (
    serviceTemplate.agentType === AgentType.Memeooorr &&
    service.name !== serviceTemplate.name
  ) {
    partialServiceTemplate.name = serviceTemplate.name;
  }

  // Check if there's a need to update or add env variables
  const envVariablesToUpdate: ServiceTemplate['env_variables'] = {};
  Object.entries(serviceTemplate.env_variables).forEach(
    ([key, templateVariable]) => {
      const serviceEnvVariable = service.env_variables[key];

      // If there's a new variable in the template but it's not in the service
      if (
        !serviceEnvVariable &&
        (templateVariable.provision_type === EnvProvisionType.FIXED ||
          templateVariable.provision_type === EnvProvisionType.COMPUTED)
      ) {
        envVariablesToUpdate[key] = templateVariable;
      }

      // If the variable exist in the service and was just updated in the template
      if (
        serviceEnvVariable &&
        serviceEnvVariable.value !== templateVariable.value &&
        templateVariable.provision_type === EnvProvisionType.FIXED
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
    serviceTemplate.configurations[serviceHomeChain].fund_requirements;

  if (
    Object.entries(serviceHomeChainFundRequirements).some(([key, item]) => {
      return (
        templateFundRequirements[key].agent !== item.agent ||
        templateFundRequirements[key].safe !== item.safe
      );
    })
  ) {
    // Need to pass all fund requirements from the template
    // even if some of them were updated
    partialServiceTemplate.configurations = {
      [serviceHomeChain]: {
        fund_requirements: templateFundRequirements,
      },
    };
  }

  if (isEmpty(partialServiceTemplate)) return;

  await ServicesService.updateService({
    serviceConfigId: service.service_config_id,
    partialServiceTemplate,
  });
};

/**
 * Check if the token is a valid service id
 */
export const isValidServiceId = (
  token: number | null | undefined | -1,
): boolean => {
  if (isNil(token)) return false;
  if (token === -1) return false;
  return !!token;
};
