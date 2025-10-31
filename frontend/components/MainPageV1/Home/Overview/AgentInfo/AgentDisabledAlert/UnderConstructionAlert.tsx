import { Button, Flex, Typography } from 'antd';

import { Alert } from '@/components/ui';
import { MiddlewareDeploymentStatusMap } from '@/constants';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';

const { Text } = Typography;

export const UnderConstructionAlert = () => {
  const { selectedService } = useServices();
  const selectedServiceStatus = selectedService?.deploymentStatus;
  const { goto } = usePageState();

  const isWithdrawn =
    selectedServiceStatus === MiddlewareDeploymentStatusMap.DELETED;

  return (
    <Alert
      type="warning"
      showIcon
      className="mt-16"
      message={
        <Flex align="center" gap={4}>
          <Text className="text-sm">
            The agent is temporarily disabled due to technical issues until
            further notice.
            {isWithdrawn ? null : ' You can withdraw your funds anytime.'}
          </Text>
          {isWithdrawn ? null : (
            <Button onClick={() => goto(Pages.AgentWallet)} size="small">
              Withdraw
            </Button>
          )}
        </Flex>
      }
    />
  );
};
