import { Button } from 'antd';

import { STEPS } from '@/components/AgentWallet/types';
import { InsufficientSignerGasModal } from '@/components/ui';
import { AddressZero, PAGES } from '@/constants';
import {
  useInsufficientGasModal,
  usePageState,
  useServiceDeployment,
} from '@/hooks';

import { AgentBusyButton } from './AgentBusyButton';

/**
 * Agent Not Running Button
 */
export const AgentNotRunningButton = () => {
  const { goto } = usePageState();
  const {
    isLoading,
    isDeployable,
    handleStart,
    isStartError,
    startError,
    resetStart,
  } = useServiceDeployment();

  const gasModalProps = useInsufficientGasModal({
    isError: isStartError,
    error: startError,
    caseType: 'start-service',
    onFund: (gasError) => {
      goto(PAGES.AgentWallet, {
        initialStep: STEPS.FUND_AGENT,
        initialFundValues: { [AddressZero]: gasError.prefill_amount_wei },
        initialFundEntrySource: 'gas-error',
      });
    },
    onClose: resetStart,
    resetMutation: resetStart,
  });

  const onStart = async () => {
    try {
      await handleStart();
    } catch {
      // The error is exposed via `startError` / `isStartError` so the host
      // can render the gas modal. Non-gas errors surface as a toast from
      // `useServiceDeployment`. Nothing else to do here.
    }
  };

  if (isLoading) {
    return <AgentBusyButton text="Loading" />;
  }

  return (
    <>
      <Button
        type="primary"
        size="large"
        disabled={!isDeployable}
        onClick={isDeployable ? onStart : undefined}
      >
        Start agent
      </Button>
      {gasModalProps && <InsufficientSignerGasModal {...gasModalProps} />}
    </>
  );
};
