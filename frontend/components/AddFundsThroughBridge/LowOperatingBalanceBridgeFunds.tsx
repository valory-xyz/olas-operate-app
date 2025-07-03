import { CHAIN_CONFIG } from '@/config/chains';
import { useMasterBalances } from '@/hooks/useBalanceContext';
import { useServices } from '@/hooks/useServices';

import { AddFundsThroughBridge } from './AddFundsThroughBridge';

/**
 * Add funds through bridge for low operating balance.
 */
export const LowOperatingBalanceBridgeFunds = () => {
  const { masterSafeNativeGasRequirement } = useMasterBalances();
  const { selectedAgentConfig } = useServices();
  const homeChainId = selectedAgentConfig.evmHomeChainId;
  const symbol = CHAIN_CONFIG[homeChainId].nativeToken.symbol;

  return (
    <AddFundsThroughBridge
      defaultTokenAmounts={[
        { symbol, amount: masterSafeNativeGasRequirement ?? 0 },
      ]}
      completionMessage="Funds have been bridged to your Pearl Safe."
    />
  );
};
