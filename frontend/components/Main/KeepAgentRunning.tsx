import { Flex, Typography } from 'antd';

import { DeploymentStatus } from '@/client';
import { useServices } from '@/hooks';
import { useStore } from '@/hooks/useStore';

import { Alert } from '../common/Alert';
import { CardSection } from '../styled/CardSection';

const { Text } = Typography;

const COVER_BLOCK_BORDERS_STYLE = { marginBottom: '-1px' };

export const KeepAgentRunning = () => {
  const { storeState } = useStore();
  const { serviceStatus } = useServices();

  if (storeState?.firstStakingRewardAchieved) return null;
  if (serviceStatus !== DeploymentStatus.DEPLOYED) return null;

  return (
    <CardSection style={COVER_BLOCK_BORDERS_STYLE}>
      <Alert
        type="info"
        fullWidth
        showIcon
        message={
          <Flex vertical>
            <Text>Your agent has not hit its target yet.</Text>
            <Text>Keep the agent running to earn today’s rewards.</Text>
          </Flex>
        }
      />
    </CardSection>
  );
};
