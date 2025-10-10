import { useMemo } from 'react';

import { useServices } from './useServices';

export const useAnotherAgentRunning = () => {
  const { services, selectedService } = useServices();

  const isAnotherAgentRunning = useMemo(() => {
    if (!services || !selectedService) return false;

    const otherServices = services.filter(
      (service) => service.service_config_id !== selectedService.service_config_id
    );

    return otherServices.length > 0;
  }, [services, selectedService]);

  return isAnotherAgentRunning;
};
