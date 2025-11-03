import { Typography } from 'antd';

import { Alert } from '@/components/ui';

const { Text } = Typography;

export const AgentRunningAlert = () => {
  return (
    <Alert
      showIcon
      centered
      className="mt-16"
      type="info"
      message={
        <Text className="text-sm">
          Another agent is currently running. You can run only one agent at a
          time.
        </Text>
      }
    />
  );
};
