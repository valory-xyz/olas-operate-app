import { Button } from 'antd';
import { isNil } from 'lodash';
import { useCallback, useEffect } from 'react';

import { PAGES } from '@/constants';
import {
  useIsInitiallyFunded,
  useMasterWalletContext,
  usePageState,
  useServices,
} from '@/hooks';

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
  const { getMasterSafeOf } = useMasterWalletContext();
  const { selectedAgentConfig } = useServices();

  const hasHomeChainSafe = !isNil(
    getMasterSafeOf?.(selectedAgentConfig.evmHomeChainId),
  );

  useEffect(() => {
    // Setup isn't finished without the Pearl Safe, which may appear after mount.
    // TODO: this component should be dummy, and check balances and service existence instead of the store.
    if (!hasHomeChainSafe) return;
    setIsInitiallyFunded();
  }, [hasHomeChainSafe, setIsInitiallyFunded]);

  const handleViewAgent = useCallback(() => {
    goto(PAGES.Main);
    onDismiss?.();
  }, [goto, onDismiss]);

  return (
    <Modal
      header={<SuccessOutlined />}
      title="Setup Complete"
      description="Your AI agent is ready to work."
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
