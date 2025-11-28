import { useMemo } from 'react';

import { TransferCryptoFromExternalWallet } from '@/components/PearlWallet';
import { CHAIN_CONFIG } from '@/config/chains';
import { PAGES } from '@/constants';
import {
  useMasterBalances,
  useMasterWalletContext,
  usePageState,
  useServices,
} from '@/hooks';
import { AvailableAsset } from '@/types/Wallet';
import { asEvmChainDetails, asMiddlewareChain } from '@/utils';

export const FundPearlWallet = () => {
  const { goto } = usePageState();
  const { selectedAgentConfig } = useServices();
  const { masterEoaGasRequirement } = useMasterBalances();
  const { masterEoa } = useMasterWalletContext();

  const homeChainId = selectedAgentConfig.evmHomeChainId;
  const symbol = CHAIN_CONFIG[homeChainId].nativeToken.symbol;

  const tokenAndDepositedAmounts = useMemo<AvailableAsset[]>(() => {
    if (!masterEoaGasRequirement) return [];
    return [{ symbol, amount: masterEoaGasRequirement }];
  }, [masterEoaGasRequirement, symbol]);

  if (!masterEoa) return null;

  const chainName = asEvmChainDetails(
    asMiddlewareChain(homeChainId),
  ).displayName;

  return (
    <TransferCryptoFromExternalWallet
      description={`Send funds from your external wallet to the Pearl Wallet address below. When you’re done, you can leave this screen — after the transfer confirms on ${chainName}, your Pearl Wallet balance updates automatically.`}
      chainName={chainName}
      address={masterEoa.address}
      tokensToDeposit={tokenAndDepositedAmounts}
      onBack={() => goto(PAGES.Main)}
      onBackToPearlWallet={() => goto(PAGES.PearlWallet)}
      requestedColumnText="Total Amount Required"
    />
  );
};
