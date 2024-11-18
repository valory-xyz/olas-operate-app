import { Flex, Typography } from 'antd';

import { MiddlewareDeploymentStatus } from '@/client';
import { useServices } from '@/hooks/useServices';
import { useStore } from '@/hooks/useStore';

import { CustomAlert } from '../../Alert';
import { CardSection } from '../../styled/CardSection';

const { Text } = Typography;

const cardSectionStyle = { marginBottom: '-1px', marginTop: '24px' };

export const KeepAgentRunningSection = () => {
  const { storeState } = useStore();
  const { serviceStatus } = useServices();

  if (storeState?.firstStakingRewardAchieved) return null;
  if (serviceStatus !== MiddlewareDeploymentStatus.DEPLOYED) return null;

  return (
    <CardSection style={cardSectionStyle}>
      <CustomAlert
        type="info"
        fullWidth
        showIcon
        message={
          <Flex vertical>
            <Text>Your agent has not hit its target yet.</Text>
            <Text>Keep the agent running to earn today&apos;s rewards.</Text>
          </Flex>
        }
      />
    </CardSection>
  );
};
