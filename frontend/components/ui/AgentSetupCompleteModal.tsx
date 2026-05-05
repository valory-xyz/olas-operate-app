import { Button } from 'antd';
import { useCallback, useEffect } from 'react';

import { PAGES } from '@/constants';
import { useIsInitiallyFunded, usePageState } from '@/hooks';

import { SuccessOutlined } from '../custom-icons';
import { Modal } from './Modal';

type AgentSetupCompleteModalProps = {
  /**
   * Fired on View Agent click, close icon, or backdrop click.
   * When provided, the modal also becomes closable via icon / backdrop.
   */
  onDismiss?: () => void;
};

export const AgentSetupCompleteModal = ({
  onDismiss,
}: AgentSetupCompleteModalProps) => {
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

  const handleViewAgent = useCallback(() => {
    goto(PAGES.Main);
    onDismiss?.();
  }, [goto, onDismiss]);

  return (
    <Modal
      header={<SuccessOutlined />}
      title="Setup Complete"
      description="Your autonomous AI agent is ready to work for you."
      closable={onDismiss !== undefined}
      onCancel={onDismiss}
      action={
        <Button
          type="primary"
          size="large"
          block
          className="mt-32"
          onClick={handleViewAgent}
        >
          View Agent
        </Button>
      }
    />
  );
};
