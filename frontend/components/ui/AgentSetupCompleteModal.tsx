import { Button } from 'antd';
import { useEffect } from 'react';

import { PAGES } from '@/constants';
import { useIsInitiallyFunded, usePageState } from '@/hooks';

import { SuccessOutlined } from '../custom-icons';
import { Modal } from './Modal';

export const AgentSetupCompleteModal = () => {
  const { goto } = usePageState();
  const { setIsInitiallyFunded } = useIsInitiallyFunded();

  useEffect(() => {
    // Since all steps for onboarding are completed,
    // we can update the store to indicate that the agent is initially funded.
    //
    // TODO: it's not ideal to handle it here, as this component should be dummy
    // Moreover, instead of relying on store state we should check balances and service existence.
    setIsInitiallyFunded();
  }, [setIsInitiallyFunded]);
  return (
    <Modal
      header={<SuccessOutlined />}
      title="Setup Complete"
      description="Your autonomous AI agent is ready to work for you."
      action={
        <Button
          type="primary"
          size="large"
          block
          className="mt-32"
          onClick={() => goto(PAGES.Main)}
        >
          View Agent
        </Button>
      }
    />
  );
};
