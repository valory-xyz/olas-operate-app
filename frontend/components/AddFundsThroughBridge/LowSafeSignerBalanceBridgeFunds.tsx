import { AddFundsThroughBridge } from '@/components/AddFundsThroughBridge/AddFundsThroughBridge';
import { CHAIN_CONFIG } from '@/config/chains';
import { useMasterBalances } from '@/hooks/useBalanceContext';
import { useServices } from '@/hooks/useServices';
import { useMasterWalletContext } from '@/hooks/useWallet';

/**
 * Add funds through bridge for low operating balance.
 */
export const LowSafeSignerBalanceBridgeFunds = () => {
  const { masterEoaGasRequirement } = useMasterBalances();
  const { masterEoa } = useMasterWalletContext();
  const { selectedAgentConfig } = useServices();

  const homeChainId = selectedAgentConfig.evmHomeChainId;
  const symbol = CHAIN_CONFIG[homeChainId].nativeToken.symbol;

  return (
    <AddFundsThroughBridge
      defaultTokenAmounts={[{ symbol, amount: masterEoaGasRequirement ?? 0 }]}
      destinationAddress={masterEoa?.address}
      onlyNativeToken={true}
      completionMessage="Funds have been bridged to your Pearl Safe Signer."
    />
  );
};
