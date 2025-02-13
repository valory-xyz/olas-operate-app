import { Button, Flex, Typography } from 'antd';

import { CustomAlert } from '@/components/Alert';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';

const { Text } = Typography;

export const YourAgentCannotSignIn = () => {
  const { goto } = usePageState();

  return (
    <CustomAlert
      type="warning"
      fullWidth
      showIcon
      message={
        <Flex justify="space-between" align="flex-start" gap={4} vertical>
          <Text className="font-weight-600">
            Your agent cannot sign in to X
          </Text>

          <Text className="text-sm">
            Check your X credentials in Pearl and verify if your X account has
            been suspended. If suspended, create a new X account and update your
            credentials in Pearl.
          </Text>

          <Button
            type="default"
            size="small"
            onClick={() => goto(Pages.UpdateAgentTemplate)}
            className="mt-4"
          >
            View credentials
          </Button>
        </Flex>
      }
    />
  );
};
