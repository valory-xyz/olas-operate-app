import { Button, Flex, Typography } from 'antd';

import { CustomAlert } from '@/components/Alert';
import { Pages } from '@/enums/Pages';
import { SetupScreen } from '@/enums/SetupScreen';
import { usePageState, useSetup } from '@/hooks';

const { Text } = Typography;

export const FundYourAgentAfterWithdrawal = () => {
  const { goto } = usePageState();
  const { goto: gotoSetup } = useSetup();

  // TODO: Ask Iason about the correct screen to navigate to.
  const handleFundYourAgent = () => {
    gotoSetup(SetupScreen.FundYourAgent);
    goto(Pages.Setup);
  };

  return (
    <CustomAlert
      showIcon
      className="mt-16"
      type="error"
      message={
        <Flex align="center" justify="space-between">
          <Text className="text-sm">
            Fund your agent to get your agent working.
          </Text>
          <Button size="small" onClick={handleFundYourAgent} disabled>
            Fund Your Agent
          </Button>
        </Flex>
      }
    />
  );
};
