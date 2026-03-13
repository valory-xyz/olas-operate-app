import { Flex, Typography } from 'antd';

import { Alert } from '@/components/ui';
import { GEO_ELIGIBILITY_DOCS_URL } from '@/constants';
import { useServices } from '@/hooks';

const { Text } = Typography;

export const AgentGeoBlockedAlert = () => {
  const { selectedAgentConfig } = useServices();

  return (
    <Alert
      type="warning"
      showIcon
      className="mt-16"
      message={
        <Flex vertical gap={4}>
          <Text className="text-sm font-weight-500">Agent Unavailable</Text>
          <Text className="text-sm">
            Trading with the {selectedAgentConfig.displayName} Agent isn’t
            available in your region. If you’re using a VPN, turn it off and try
            again. You can withdraw available agent’s funds at any time.
          </Text>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={GEO_ELIGIBILITY_DOCS_URL}
            className="text-sm"
          >
            Learn about regional availability
          </a>
        </Flex>
      }
    />
  );
};
