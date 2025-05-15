import { Button, Flex, Typography } from 'antd';

import { CustomAlert } from '@/components/Alert';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';

const { Text } = Typography;

export const UpdateAgentConfiguration = () => {
  const { goto } = usePageState();

  return (
    <CustomAlert
      type="error"
      fullWidth
      showIcon
      message={
        <Flex justify="space-between" align="flex-start" gap={4} vertical>
          <Text className="font-weight-600">
            Action required: Update agent’s configurations
          </Text>

          <Text className="text-sm">
            The latest update almost eliminates the possibility of your X
            account being suspended. To benefit from these improvements, you
            need to update your agent&apos;s configurations.
          </Text>

          <Button
            type="default"
            size="small"
            onClick={() => goto(Pages.UpdateAgentTemplate)}
            className="mt-4"
          >
            Update configurations
          </Button>
        </Flex>
      }
    />
  );
};

/**
 * TODO:
 * 1. what if the agent is running?
 * 2. Add appropriate validation if the above alert should be shown
 * 3. Is the agent updated as expected?
 * 4. Update and restart the agent as expected
 */
