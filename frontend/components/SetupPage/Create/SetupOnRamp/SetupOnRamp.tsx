import { useCallback } from 'react';

import { OnRamp } from '@/components/OnRamp';
import { CardSkeleton } from '@/components/ui';
import { AddressZero, ON_RAMP_CHAIN_MAP, SETUP_SCREEN } from '@/constants';
import { LatchedBackupSignerContext } from '@/context/LatchedBackupSignerContext';
import {
  useBackupSignerGuard,
  useGetBridgeRequirementsParams,
  useServices,
  useSetup,
} from '@/hooks';
import { asMiddlewareChain } from '@/utils';

import { BackupSignerUnavailable } from '../../BackupSignerUnavailable';

export const SetupOnRamp = () => {
  const { goto: gotoSetup, prevState } = useSetup();
  const { selectedAgentConfig } = useServices();
  const { latchedSigner, isBackupSignerReady, isBackupSignerError } =
    useBackupSignerGuard();

  // Calculate onRampChainId based on agent's home chain
  const agentChainName = asMiddlewareChain(selectedAgentConfig.evmHomeChainId);
  const onRampChainId = ON_RAMP_CHAIN_MAP[agentChainName].chain;

  // Get requirements params function (use 'to' direction for on-ramping)
  const getOnRampRequirementsParams = useGetBridgeRequirementsParams(
    onRampChainId,
    AddressZero,
    'to',
  );

  const handleBack = useCallback(() => {
    gotoSetup(prevState ?? SETUP_SCREEN.FundYourAgent);
  }, [gotoSetup, prevState]);

  // The on-ramp ends by creating the Pearl Safe with the backup signer.
  if (isBackupSignerError) return <BackupSignerUnavailable />;
  if (!isBackupSignerReady) {
    return <CardSkeleton />;
  }

  // The on-ramp creates the Pearl Safe at the end: it uses this screen's latched signer.
  return (
    <LatchedBackupSignerContext.Provider value={latchedSigner}>
      <OnRamp
        mode="onboard"
        getOnRampRequirementsParams={getOnRampRequirementsParams}
        handleBack={handleBack}
      />
    </LatchedBackupSignerContext.Provider>
  );
};
