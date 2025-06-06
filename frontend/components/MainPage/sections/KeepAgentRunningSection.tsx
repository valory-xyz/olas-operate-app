import { Flex, Typography } from 'antd';

import { MiddlewareDeploymentStatus } from '@/client';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { useStore } from '@/hooks/useStore';

import { CustomAlert } from '../../Alert';
import { CardSection } from '../../styled/CardSection';

const { Text } = Typography;

const cardSectionStyle = { marginBottom: '-1px' };

export const KeepAgentRunningSection = () => {
  const { storeState } = useStore();

  const { selectedService } = useServices();
  const { deploymentStatus: serviceStatus } = useService(
    selectedService?.service_config_id,
  );

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
