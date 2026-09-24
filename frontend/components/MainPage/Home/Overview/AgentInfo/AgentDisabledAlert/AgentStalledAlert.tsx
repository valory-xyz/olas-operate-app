import { Typography } from 'antd';

import { Alert } from '@/components/ui';
import { useAgentActivity } from '@/hooks';

const { Text } = Typography;

/**
 * Non-blocking warning shown when the agent is alive and answering but has
 * stopped advancing its FSM (OPE-1941).
 *
 * Self-hiding, like the other alerts in the non-exclusive group it sits in: a
 * stall is transient and recoverable, unlike the arms above it (phased out,
 * geo-blocked, evicted, no slots), which are states the agent cannot trade its
 * way out of. An agent can be both stalled and low on gas, and both should say
 * so.
 *
 * Needs no persisted state because it clears itself: the dwell it is derived
 * from resets to zero on the next FSM transition.
 */
export const AgentStalledAlert = () => {
  const { isAgentStalled } = useAgentActivity();

  if (!isAgentStalled) return null;

  return (
    <Alert
      showIcon
      className="mt-16"
      type="warning"
      message={
        <>
          <Text className="text-sm font-weight-500">
            Agent isn&apos;t progressing
          </Text>
          {/*
            Deliberately promises nothing. The middleware does restart an agent
            after 300 s of unhealthy probes today, but `valory-xyz/trader#1042`
            makes `is_healthy` stay true for up to 700 s in the affected rounds,
            so Pearl can show a two-minute stall with no restart coming. Copy
            promising one would be false the moment that ships.
          */}
          <Text className="text-sm flex mt-4">
            Your agent hasn&apos;t made progress in a few minutes. You
            don&apos;t need to do anything yet.
          </Text>
        </>
      }
    />
  );
};
