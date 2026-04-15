import { Button, Typography } from 'antd';
import { useEffect } from 'react';

import { Alert } from '@/components/ui';
import { PAGES, SETUP_SCREEN } from '@/constants';
import { usePageState, useSetup } from '@/hooks';
import { SetupState } from '@/hooks/useCompleteAgentSetup';

const { Text } = Typography;

type UnfinishedSetupAlertProps = {
  setupState: SetupState;
  handleCompleteSetup: () => void;
  shouldNavigateToFundYourAgent: boolean;
  resetShouldNavigate: () => void;
};

export const UnfinishedSetupAlert = ({
  setupState,
  handleCompleteSetup,
  shouldNavigateToFundYourAgent,
  resetShouldNavigate,
}: UnfinishedSetupAlertProps) => {
  const { goto } = usePageState();
  const { goto: gotoSetup } = useSetup();

  useEffect(() => {
    if (shouldNavigateToFundYourAgent) {
      gotoSetup(SETUP_SCREEN.FundYourAgent);
      goto(PAGES.Setup);
      resetShouldNavigate();
    }
  }, [shouldNavigateToFundYourAgent, gotoSetup, goto, resetShouldNavigate]);

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
          <Button
            size="small"
            onClick={handleCompleteSetup}
            disabled={setupState === 'detecting'}
          >
            Complete Setup
          </Button>
        </>
      }
    />
  );
};
