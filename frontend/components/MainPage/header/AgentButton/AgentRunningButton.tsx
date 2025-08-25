import { InfoCircleOutlined } from '@ant-design/icons';
import { Button, Flex, Tooltip, Typography } from 'antd';
import { useCallback } from 'react';

import { MiddlewareDeploymentStatus } from '@/client';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { Pages } from '@/enums/Pages';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { usePageState } from '@/hooks/usePageState';
import { useRewardContext } from '@/hooks/useRewardContext';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { ServicesService } from '@/service/Services';

import { LastTransaction } from '../LastTransaction';

const { Text } = Typography;

const IdleTooltip = () => (
  <Tooltip
    placement="bottom"
    arrow={false}
    overlayInnerStyle={{ lineHeight: 'normal' }}
    title={
      <Text className="text-sm">
        Your agent earned rewards for this epoch, so decided to stop working
        until the next epoch.
      </Text>
    }
  >
    <InfoCircleOutlined />
  </Tooltip>
);

const WhatIsAgentDoing = () => {
  const { goto } = usePageState();
  return (
    <Button
      type="link"
      className="p-0 text-xs"
      style={{ height: 'auto', border: 'none' }}
      onClick={() => goto(Pages.AgentActivity)}
    >
      What&apos;s my agent doing?
    </Button>
  );
};

export const AgentRunningButton = () => {
  const [isLastTransactionEnabled, isAgentActivityEnabled] = useFeatureFlag([
    'last-transactions',
    'agent-activity',
  ]);
  const { showNotification } = useElectronApi();
  const { isPageLoadedAndOneMinutePassed } = usePageState();
  const { isEligibleForRewards } = useRewardContext();

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
      // setPaused(false);
      overrideSelectedServiceStatus(null); // remove override
    }
  }, [overrideSelectedServiceStatus, service, showNotification]);

  // Do not show the last transaction if the delay is not reached
  const canShowLastTransaction =
    isLastTransactionEnabled && isPageLoadedAndOneMinutePassed;

  return (
    <Flex gap={8} align="center">
      <Button type="default" size="large" onClick={handlePause}>
        Pause
      </Button>

      <Flex vertical align="start">
        <Flex>
          {isEligibleForRewards ? (
            <Text type="secondary" className="text-xs">
              <IdleTooltip />
              &nbsp;Idle
            </Text>
          ) : (
            <Text
              type="secondary"
              className={`text-xs ${canShowLastTransaction ? '' : 'loading-ellipses '}`}
            >
              Working
            </Text>
          )}

          {canShowLastTransaction && (
            <>
              <Text style={{ lineHeight: 1 }}>
                &nbsp;{UNICODE_SYMBOLS.SMALL_BULLET}&nbsp;
              </Text>
              <LastTransaction serviceConfigId={serviceConfigId} />
            </>
          )}
        </Flex>

        {isAgentActivityEnabled && <WhatIsAgentDoing />}
      </Flex>
    </Flex>
  );
};
