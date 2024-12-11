import { useMemo } from 'react';

import { CHAIN_CONFIG } from '@/config/chains';
import { useServices } from '@/hooks/useServices';
import { useMasterWalletContext } from '@/hooks/useWallet';

/**
 * helper hook specific to get low funds details such as
 * - chain information
 * - master/eoa safe addresses
 */
export const useLowFundsDetails = () => {
  const { selectedAgentConfig } = useServices();
  const homeChainId = selectedAgentConfig.evmHomeChainId;

  const { masterEoa, masterSafes } = useMasterWalletContext();

  // master safe details
  const selectedMasterSafe = useMemo(() => {
    if (!masterSafes) return;
    if (!homeChainId) return;

    return masterSafes.find(
      (masterSafe) => masterSafe.evmChainId === homeChainId,
    );
  }, [masterSafes, homeChainId]);

  // current chain details
  const { name: chainName, nativeToken } = CHAIN_CONFIG[homeChainId];

  return {
    chainName,
    tokenSymbol: nativeToken.symbol,
    masterSafeAddress: selectedMasterSafe?.address,
    masterEoaAddress: masterEoa?.address,
  };
};
