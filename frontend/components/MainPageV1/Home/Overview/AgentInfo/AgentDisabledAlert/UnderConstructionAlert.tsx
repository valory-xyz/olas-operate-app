import { Button, Typography } from 'antd';

import { Alert } from '@/components/ui';
import { Pages } from '@/enums/Pages';
import { usePageState, useServices, useSharedContext } from '@/hooks';

const { Text } = Typography;

export const UnderConstructionAlert = () => {
  const { selectedAgentConfig } = useServices();
  const { goto } = usePageState();
  const { mainOlasBalance } = useSharedContext();

  const hasExternalFunds = selectedAgentConfig.hasExternalFunds;
  const canWithdraw = mainOlasBalance !== 0;

  return (
    <Alert
      type="warning"
      className="mt-16"
      centered={!canWithdraw}
      showIcon
      message={
        <Text className="text-sm">
          The agent is temporarily disabled due to technical issues until
          further notice.{' '}
          {canWithdraw &&
            (hasExternalFunds
              ? 'You can start your agent to withdraw its funds at any time.'
              : `You can withdraw your funds anytime.`)}
        </Text>
      }
      action={
        canWithdraw && (
          <Button onClick={() => goto(Pages.PearlWallet)} size="small">
            Withdraw
          </Button>
        )
      }
    />
  );
};
