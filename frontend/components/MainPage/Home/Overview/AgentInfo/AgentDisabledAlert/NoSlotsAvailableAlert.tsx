import { Button, Typography } from 'antd';

import { Alert } from '@/components/ui';
import { PAGES } from '@/constants';
import { usePageState } from '@/hooks';

const { Text } = Typography;

export const NoSlotsAvailableAlert = () => {
  const { goto } = usePageState();

  return (
    <Alert
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
        <Button onClick={() => goto(PAGES.AgentStaking)} size="small">
          Manage Staking
        </Button>
      }
    />
  );
};
