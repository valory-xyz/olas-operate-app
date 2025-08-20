import { Button } from 'antd';
import { useCallback } from 'react';

import { MiddlewareDeploymentStatusMap } from '@/constants/deployment';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useServices } from '@/hooks/useServices';
import { ServicesService } from '@/service/Services';

export const AgentRunningButton = () => {
  const { showNotification } = useElectronApi();
  const { selectedService, overrideSelectedServiceStatus } = useServices();

  const handlePause = useCallback(async () => {
    if (!selectedService) return;

    // Optimistically update service status
    overrideSelectedServiceStatus(MiddlewareDeploymentStatusMap.STOPPING);
    try {
      await ServicesService.stopDeployment(selectedService.service_config_id);
    } catch (error) {
      console.error(error);
      showNotification?.('Error while stopping agent');
    } finally {
      overrideSelectedServiceStatus(null); // remove override
    }
  }, [overrideSelectedServiceStatus, selectedService, showNotification]);

  return (
    <Button type="default" size="large" onClick={handlePause}>
      Pause Agent
    </Button>
  );
};
