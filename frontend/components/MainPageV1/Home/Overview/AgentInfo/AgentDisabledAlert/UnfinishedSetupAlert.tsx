import { Button, Typography } from 'antd';

import { Alert } from '@/components/ui';
import { Pages, SetupScreen } from '@/constants';
import { usePageState, useSetup } from '@/hooks';

const { Text } = Typography;

export const UnfinishedSetupAlert = () => {
  const { goto } = usePageState();
  const { goto: gotoSetup } = useSetup();

  const handleCompleteSetup = () => {
    gotoSetup(SetupScreen.FundYourAgent);
    goto(Pages.Setup);
  };

  return (
    <Alert
      showIcon
      className="mt-16"
      type="error"
      message={
        <>
          <Text className="text-sm font-weight-500">Complete Agent Setup</Text>
          <Text className="text-sm flex mt-4 mb-8">
            Setup is nearly done. Fund the agent so it has what it needs to
            start working.
          </Text>
          <Button size="small" onClick={handleCompleteSetup}>
            Complete Setup
          </Button>
        </>
      }
    />
  );
};
