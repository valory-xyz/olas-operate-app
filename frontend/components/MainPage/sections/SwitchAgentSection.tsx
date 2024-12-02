import { Button, Flex, Typography } from 'antd';
import Image from 'next/image';

import { CardSection } from '@/components/styled/CardSection';
import { useServices } from '@/hooks/useServices';

const { Text } = Typography;

export const SwitchAgentSection = () => {
  const { selectedAgentConfig, selectedAgentType } = useServices();

  return (
    <CardSection
      gap={8}
      padding="12px 24px"
      justify="space-between"
      align="center"
      borderbottom="true"
    >
      <Flex gap={12} align="center">
        <Image
          src={`/agent-${selectedAgentType}-icon.png`}
          width={24}
          height={24}
          alt={selectedAgentConfig.displayName}
        />
        <Text>{selectedAgentConfig.displayName}</Text>
      </Flex>

      <Button type="primary" ghost>
        Switch agent
      </Button>
    </CardSection>
  );
};
