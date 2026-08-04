import { useQueryClient } from '@tanstack/react-query';
import { Button } from 'antd';
import { useCallback } from 'react';

import { FIVE_SECONDS_INTERVAL, REACT_QUERY_KEYS } from '@/constants';
import { MiddlewareDeploymentStatusMap } from '@/constants/deployment';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useServices } from '@/hooks/useServices';
import { ServicesService } from '@/service/Services';

export const AgentRunningButton = () => {
  const queryClient = useQueryClient();
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
      setTimeout(async () => {
        setPaused(false);
        try {
          await queryClient.refetchQueries({
            queryKey: REACT_QUERY_KEYS.ALL_SERVICE_DEPLOYMENTS_KEY,
          });
        } catch {
          // Ignore network errors; the override is cleared regardless so the
          // UI does not stay stuck in STOPPING indefinitely.
        }
        overrideSelectedServiceStatus(null); // remove override
      }, FIVE_SECONDS_INTERVAL);
    }
  }, [
    overrideSelectedServiceStatus,
    queryClient,
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
