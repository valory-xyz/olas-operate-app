import { Typography } from 'antd';

import { CustomAlert } from '@/components/Alert';

const { Text } = Typography;

export const AgentRunningAlert = () => {
  return (
    <CustomAlert
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
