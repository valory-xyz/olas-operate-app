import { Button, Typography } from 'antd';

import { CustomAlert } from '@/components/Alert';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { useSharedContext } from '@/hooks/useSharedContext';

const { Text } = Typography;

export const UnderConstructionAlert = () => {
  const { goto } = usePageState();
  const { mainOlasBalance } = useSharedContext();

  const canWithdraw = mainOlasBalance === 0;

  return (
    <CustomAlert
      type="error"
      className="mt-16"
      centered={!canWithdraw}
      showIcon
      message={
        <Text className="text-sm">
          The agent is temporarily disabled due to technical issues until
          further notice.{' '}
          {canWithdraw && `You can withdraw your funds anytime.`}
        </Text>
      }
      action={
        canWithdraw && (
          <Button onClick={() => goto(Pages.ManageWallet)} size="small">
            Withdraw
          </Button>
        )
      }
    />
  );
};
