import { AddFundsThroughBridge } from '@/components/AddFundsThroughBridge/AddFundsThroughBridge';
import { CHAIN_CONFIG } from '@/config/chains';
import { useMasterBalances } from '@/hooks/useBalanceContext';
import { useServices } from '@/hooks/useServices';

/**
 * Add funds through bridge for low operating balance.
 */
export const LowSafeSignerBalanceBridgeFunds = () => {
  const { masterSafeNativeGasRequirement } = useMasterBalances();
  const { selectedAgentConfig } = useServices();
  const homeChainId = selectedAgentConfig.evmHomeChainId;
  const symbol = CHAIN_CONFIG[homeChainId].nativeToken.symbol;

  return (
    <AddFundsThroughBridge
      defaultTokenAmounts={[
        { symbol, amount: masterSafeNativeGasRequirement ?? 0 },
      ]}
    />
  );
};
