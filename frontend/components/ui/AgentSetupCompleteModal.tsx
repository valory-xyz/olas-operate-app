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
    // Without the Pearl Safe the agent cannot start, and a set flag would hide
    // "Complete setup". The Safe can appear after mount, once wallets refetch.
    //
    // TODO: it's not ideal to handle it here, as this component should be dummy
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
