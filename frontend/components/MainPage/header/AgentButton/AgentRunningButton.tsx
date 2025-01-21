import { InfoCircleOutlined } from '@ant-design/icons';
import { Button, Flex, Tooltip, Typography } from 'antd';
import { useCallback } from 'react';

import { MiddlewareDeploymentStatus } from '@/client';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useRewardContext } from '@/hooks/useRewardContext';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { ServicesService } from '@/service/Services';

import { LastTransaction } from '../LastTransaction';
import { WhatIsAgentDoing } from '../WhatIsAgentDoing';

const { Paragraph, Text } = Typography;

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
  const [isLastTransactionEnabled, isAgentActivityEnabled] = useFeatureFlag([
    'last-transactions',
    'agent-activity',
  ]);
  const { showNotification } = useElectronApi();
  const { isEligibleForRewards } = useRewardContext();

  const {
    selectedService,
    isFetched: isLoaded,
    setPaused,
    overrideSelectedServiceStatus,
  } = useServices();

  const serviceConfigId =
    isLoaded && selectedService?.service_config_id
      ? selectedService.service_config_id
      : '';
  const { service } = useService(serviceConfigId);

  const handlePause = useCallback(async () => {
    if (!service) return;
    // Paused to stop overlapping service poll while waiting for response
    // setPaused(true);

    // Optimistically update service status
    overrideSelectedServiceStatus(MiddlewareDeploymentStatus.STOPPING);
    try {
      await ServicesService.stopDeployment(service.service_config_id);
    } catch (error) {
      console.error(error);
      showNotification?.('Error while stopping agent');
    } finally {
      // Resume polling, will update to correct status regardless of success
      setPaused(false);
      overrideSelectedServiceStatus(null); // remove override
    }
  }, [overrideSelectedServiceStatus, service, setPaused, showNotification]);

  return (
    <Flex gap={10} align="center">
      <Button type="default" size="large" onClick={handlePause}>
        Pause
      </Button>

      <Flex vertical align="start">
        <Flex>
          {isEligibleForRewards ? (
            <Text type="secondary" className="text-xs">
              Idle&nbsp;{UNICODE_SYMBOLS.SMALL_BULLET}&nbsp;
              <IdleTooltip />
            </Text>
          ) : (
            <Text type="secondary" className="text-xs">
              Working&nbsp;{UNICODE_SYMBOLS.SMALL_BULLET}&nbsp;
            </Text>
          )}

          {isLastTransactionEnabled && (
            <LastTransaction serviceConfigId={serviceConfigId} />
          )}
        </Flex>

        {isAgentActivityEnabled && <WhatIsAgentDoing />}
      </Flex>
    </Flex>
  );
};
