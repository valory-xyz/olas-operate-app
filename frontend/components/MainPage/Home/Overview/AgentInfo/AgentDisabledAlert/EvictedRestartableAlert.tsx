import { Button, Flex, Typography } from 'antd';
import { useState } from 'react';

import { Alert } from '@/components/ui';
import { useServiceDeployment } from '@/hooks';

const { Text } = Typography;

/**
 * Eviction alert for a service that is eligible to stake again.
 *
 * `EvictedAlert` covers the other case — evicted and still inside
 * `minimumStakingDuration`, where nothing can be done until the window ends.
 * Both surfaces used to be gated on that case alone, so the recoverable
 * eviction — the one where restarting is precisely the fix — showed nothing at
 * all. Auto-run recovers a *running* instance on its own; this alert is for the
 * stopped one, which no automatic recovery reaches.
 */
export const EvictedRestartableAlert = () => {
  const { handleStart } = useServiceDeployment();
  const [isStarting, setIsStarting] = useState(false);

  const onRestart = async () => {
    setIsStarting(true);
    try {
      await handleStart();
    } catch {
      // Surfaced by `useServiceDeployment` as a toast or the gas modal.
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <Alert
      showIcon
      className="mt-16"
      type="warning"
      message={
        <Flex vertical gap={8} align="flex-start">
          <Text className="text-sm">
            <span className="font-weight-600">
              Agent was evicted from staking
            </span>{' '}
            <br />
            The agent didn&apos;t meet staking requirements and was evicted.
            It&apos;s eligible to stake again — restart it to re-stake and
            resume earning rewards.
          </Text>
          <Button
            type="primary"
            size="small"
            loading={isStarting}
            disabled={isStarting}
            onClick={onRestart}
          >
            Restart agent
          </Button>
        </Flex>
      }
    />
  );
};
