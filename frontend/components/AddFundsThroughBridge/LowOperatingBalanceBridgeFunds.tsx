import { AddFundsThroughBridge } from '@/components/AddFundsThroughBridge/AddFundsThroughBridge';
import { CHAIN_CONFIG } from '@/config/chains';
import { useMasterBalances } from '@/hooks/useBalanceContext';
import { useServices } from '@/hooks/useServices';

export const LowOperatingBalanceBridgeFunds = () => {
  const { selectedAgentConfig } = useServices();
  const homeChainId = selectedAgentConfig.evmHomeChainId;
  const symbol = CHAIN_CONFIG[homeChainId].nativeToken.symbol;
  const { masterSafeNativeGasRequirement } = useMasterBalances();

  return (
    <AddFundsThroughBridge
      defaultTokenAmounts={[
        { symbol, amount: masterSafeNativeGasRequirement ?? 0 },
      ]}
    />
  );
};
