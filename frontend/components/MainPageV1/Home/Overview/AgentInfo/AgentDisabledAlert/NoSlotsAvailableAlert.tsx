import { Button, Typography } from 'antd';

import { CustomAlert } from '@/components/Alert';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';

const { Text } = Typography;

export const NoSlotsAvailableAlert = () => {
  const { goto } = usePageState();
  return (
    <CustomAlert
      showIcon
      className="mt-16"
      type="error"
      message={
        <Text className="text-sm">
          All slots in the current staking contract are taken, so your agent
          can&apos;t start. Select another contract or check back later.
        </Text>
      }
      action={
        <Button onClick={() => goto(Pages.ManageStaking)} size="small">
          Manage Staking
        </Button>
      }
    />
  );
};
