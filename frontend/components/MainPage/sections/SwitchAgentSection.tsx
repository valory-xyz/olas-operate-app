import { Button, Flex, Typography } from 'antd';
import Image from 'next/image';

import { CardSection } from '@/components/styled/CardSection';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';

const { Text } = Typography;

export const SwitchAgentSection = () => {
  const { selectedAgentConfig, selectedAgentType } = useServices();
  const { goto } = usePageState();

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

      <Button type="primary" ghost onClick={() => goto(Pages.SwitchAgent)}>
        Switch agent
      </Button>
    </CardSection>
  );
};
