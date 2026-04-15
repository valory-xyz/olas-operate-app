import { Button, Typography } from 'antd';
import { useEffect } from 'react';

import {
  AgentSetupCompleteModal,
  Alert,
  FinishingSetupModal,
  MasterSafeCreationFailedModal,
} from '@/components/ui';
import { PAGES, SETUP_SCREEN } from '@/constants';
import { useCompleteAgentSetup, usePageState, useSetup } from '@/hooks';

const { Text } = Typography;

export const UnfinishedSetupAlert = () => {
  const { goto } = usePageState();
  const { goto: gotoSetup } = useSetup();

  const {
    setupState,
    handleCompleteSetup,
    modalToShow,
    shouldNavigateToFundYourAgent,
    resetShouldNavigate,
    handleTryAgain,
    handleContactSupport,
  } = useCompleteAgentSetup();

  useEffect(() => {
    if (shouldNavigateToFundYourAgent) {
      gotoSetup(SETUP_SCREEN.FundYourAgent);
      goto(PAGES.Setup);
      resetShouldNavigate();
    }
  }, [shouldNavigateToFundYourAgent, gotoSetup, goto, resetShouldNavigate]);

  return (
    <>
      <Alert
        showIcon
        className="mt-16"
        type="error"
        message={
          <>
            <Text className="text-sm font-weight-500">
              Complete Agent Setup
            </Text>
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

      {modalToShow === 'creatingSafe' && <FinishingSetupModal />}
      {modalToShow === 'setupComplete' && <AgentSetupCompleteModal />}
      {modalToShow === 'safeCreationFailed' && (
        <MasterSafeCreationFailedModal
          onTryAgain={handleTryAgain}
          onContactSupport={handleContactSupport}
        />
      )}
    </>
  );
};
