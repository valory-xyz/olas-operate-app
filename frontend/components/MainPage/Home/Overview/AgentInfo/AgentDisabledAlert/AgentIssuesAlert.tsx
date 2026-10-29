import { Flex, Typography } from 'antd';

import { Alert } from '@/components/ui';
import { AgentIssue } from '@/types';

const { Text } = Typography;

/** Problems that stop the agent working, in the layout of `AgentGeoBlockedAlert`. */
export const AgentIssuesAlert = ({ issues }: { issues: AgentIssue[] }) => (
  <Alert
    type="warning"
    showIcon
    className="mt-16"
    message={
      <Flex vertical gap={12}>
        {issues.map(({ code, title, description }) => (
          <Flex key={code} vertical gap={4}>
            <Text className="text-sm font-weight-500">{title}</Text>
            <Text className="text-sm">{description}</Text>
          </Flex>
        ))}
      </Flex>
    }
  />
);
