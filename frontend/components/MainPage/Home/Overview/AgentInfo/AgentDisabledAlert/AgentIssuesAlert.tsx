import { Flex, Typography } from 'antd';

import { Alert } from '@/components/ui';

const { Text } = Typography;

type AlertText = { title: string; description: string };

/** Problems that stop the agent working, in the layout of `AgentGeoBlockedAlert`. */
export const AgentIssuesAlert = ({ issues }: { issues: AlertText[] }) => (
  <Alert
    type="warning"
    showIcon
    className="mt-16"
    message={
      <Flex vertical gap={12}>
        {issues.map(({ title, description }) => (
          <Flex key={title} vertical gap={4}>
            <Text className="text-sm font-weight-500">{title}</Text>
            <Text className="text-sm">{description}</Text>
          </Flex>
        ))}
      </Flex>
    }
  />
);
