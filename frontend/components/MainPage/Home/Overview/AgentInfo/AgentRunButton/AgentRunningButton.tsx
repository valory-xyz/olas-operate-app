import { Button } from 'antd';
import { useCallback } from 'react';

import { FIVE_SECONDS_INTERVAL } from '@/constants';
import { MiddlewareDeploymentStatusMap } from '@/constants/deployment';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useServices } from '@/hooks/useServices';
import { ServicesService } from '@/service/Services';

export const AgentRunningButton = () => {
  const { showNotification } = useElectronApi();
  const { selectedService, overrideSelectedServiceStatus, setPaused } =
    useServices();

  const handlePause = useCallback(async () => {
    if (!selectedService) return;

    // Paused to stop overlapping service poll while waiting for response
    setPaused(true);
    // Optimistically update service status
    overrideSelectedServiceStatus(MiddlewareDeploymentStatusMap.STOPPING);
    try {
      await ServicesService.stopDeployment(selectedService.service_config_id);
    } catch (error) {
      console.error(error);
      showNotification?.('Error while stopping agent');
    } finally {
      // Resume polling in services refetch interval,
      // will update to correct status regardless of success
      setTimeout(() => {
        setPaused(false);
        overrideSelectedServiceStatus(null); // remove override
      }, FIVE_SECONDS_INTERVAL);
    }
  }, [
    overrideSelectedServiceStatus,
    selectedService,
    setPaused,
    showNotification,
  ]);

  return (
    <Button type="default" size="large" onClick={handlePause}>
      Pause Agent
    </Button>
  );
};
