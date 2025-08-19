import { Button } from 'antd';
import { useCallback } from 'react';

import { MiddlewareDeploymentStatusMap } from '@/constants/deployment';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { ServicesService } from '@/service/Services';

export const AgentRunningButton = () => {
  const { showNotification } = useElectronApi();

  const {
    selectedService,
    isFetched: isLoaded,
    overrideSelectedServiceStatus,
  } = useServices();

  const serviceConfigId =
    isLoaded && selectedService?.service_config_id
      ? selectedService.service_config_id
      : '';
  const { service } = useService(serviceConfigId);

  const handlePause = useCallback(async () => {
    if (!service) return;

    // Optimistically update service status
    overrideSelectedServiceStatus(MiddlewareDeploymentStatusMap.STOPPING);
    try {
      await ServicesService.stopDeployment(service.service_config_id);
    } catch (error) {
      console.error(error);
      showNotification?.('Error while stopping agent');
    } finally {
      overrideSelectedServiceStatus(null); // remove override
    }
  }, [overrideSelectedServiceStatus, service, showNotification]);

  return (
    <Button type="default" size="large" onClick={handlePause}>
      Pause Agent
    </Button>
  );
};
