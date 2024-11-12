import { ServiceTemplate } from '@/client/types';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';

export const useServiceTemplates = () => {
  const getServiceTemplates = (): ServiceTemplate[] => SERVICE_TEMPLATES;
  const getServiceTemplate = (
    serviceUuid: string,
  ): ServiceTemplate | undefined =>
    SERVICE_TEMPLATES.find(
      (template) => template.service_config_id === serviceUuid,
    );

  return {
    getServiceTemplate,
    getServiceTemplates,
    serviceTemplate: SERVICE_TEMPLATES[0], // Default to the first template
  };
};
