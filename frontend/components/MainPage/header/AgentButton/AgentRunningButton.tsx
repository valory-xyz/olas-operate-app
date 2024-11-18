import { InfoCircleOutlined } from '@ant-design/icons';
import { Button, Flex, Tooltip, Typography } from 'antd';
import { useCallback } from 'react';

import { MiddlewareDeploymentStatus } from '@/client';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useReward } from '@/hooks/useReward';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { ServicesService } from '@/service/Services';

import { LastTransaction } from '../LastTransaction';

const { Paragraph } = Typography;

const IdleTooltip = () => (
  <Tooltip
    placement="bottom"
    arrow={false}
    title={
      <Paragraph className="text-sm m-0">
        Your agent earned rewards for this epoch, so decided to stop working
        until the next epoch.
      </Paragraph>
    }
  >
    <InfoCircleOutlined />
  </Tooltip>
);

export const AgentRunningButton = () => {
  const { showNotification } = useElectronApi();
  const { isEligibleForRewards } = useReward();

  const { selectedService, isLoaded, setPaused } = useServices();

  const { service, setDeploymentStatus } = useService({
    serviceConfigId:
      isLoaded && selectedService?.service_config_id
        ? selectedService.service_config_id
        : '',
  });

  const handlePause = useCallback(async () => {
    if (!service) return;
    // Paused to stop overlapping service poll while waiting for response
    setPaused(true);

    // Optimistically update service status
    setDeploymentStatus(MiddlewareDeploymentStatus.STOPPING);
    try {
      await ServicesService.stopDeployment(service.service_config_id);
    } catch (error) {
      console.error(error);
      showNotification?.('Error while stopping agent');
    } finally {
      // Resume polling, will update to correct status regardless of success
      setPaused(false);
    }
  }, [service, setDeploymentStatus, setPaused, showNotification]);

  return (
    <Flex gap={10} align="center">
      <Button type="default" size="large" onClick={handlePause}>
        Pause
      </Button>

      <Flex vertical>
        {isEligibleForRewards ? (
          <Paragraph type="secondary" className="text-sm">
            Agent is idle&nbsp;
            <IdleTooltip />
          </Paragraph>
        ) : (
          <Paragraph type="secondary" className="text-sm loading-ellipses">
            Agent is working
          </Paragraph>
        )}
        <LastTransaction />
      </Flex>
    </Flex>
  );
};
