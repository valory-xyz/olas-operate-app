import { Typography } from 'antd';

import { Alert } from '@/components/ui';

const { Text } = Typography;

/**
 * Eviction alert for a service that is eligible to stake again.
 *
 * `EvictedAlert` covers the other case — evicted and still inside
 * `minimumStakingDuration`, where nothing can be done until the window ends.
 * Both surfaces used to be gated on that case alone, so the recoverable
 * eviction — the one where restarting is precisely the fix — showed nothing at
 * all.
 *
 * Informational by design, with no button of its own: `AgentInfo` renders
 * `AgentRunButton` immediately above this alert, so a stopped agent already
 * shows "Start agent" wired to the same `handleStart` a few pixels up. With
 * auto-run on, that button is replaced by the auto-run badge and the eviction
 * watchdog performs the restart itself.
 */
export const EvictedRestartableAlert = () => (
  <Alert
    showIcon
    className="mt-16"
    type="warning"
    message={
      <Text className="text-sm">
        <span className="font-weight-600">Agent was evicted from staking</span>{' '}
        <br />
        The agent didn&apos;t meet staking requirements and was evicted.
        It&apos;s eligible to stake again — restarting it will re-stake the
        agent and resume rewards.
      </Text>
    }
  />
);
