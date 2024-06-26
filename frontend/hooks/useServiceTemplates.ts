import { ServiceTemplate } from '@/client/types';
import { SERVICE_TEMPLATES } from '@/constants';

export const useServiceTemplates = () => {
  const getServiceTemplates = (): ServiceTemplate[] => SERVICE_TEMPLATES;
  const getServiceTemplate = (hash: string): ServiceTemplate | undefined =>
    SERVICE_TEMPLATES.find((template) => template.hash === hash);

  return {
    getServiceTemplate,
    getServiceTemplates,
  };
};
