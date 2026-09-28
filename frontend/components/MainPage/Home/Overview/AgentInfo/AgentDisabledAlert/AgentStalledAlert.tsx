import { Typography } from 'antd';

import { Alert } from '@/components/ui';
import { useAgentActivity } from '@/hooks';

const { Text } = Typography;

/** Self-hiding: clears on the next FSM transition, which resets the dwell. */
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
          {/* Promises no restart: a stall can clear the bar with none coming. */}
          <Text className="text-sm flex mt-4">
            Your agent hasn&apos;t made progress in a few minutes. You
            don&apos;t need to do anything yet.
          </Text>
        </>
      }
    />
  );
};
