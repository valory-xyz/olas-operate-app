import { useMemo } from 'react';

import { CHAIN_CONFIG } from '@/config/chains';
import { Pages } from '@/enums';
import {
  useMasterBalances,
  useMasterWalletContext,
  usePageState,
  useServices,
} from '@/hooks';
import { AvailableAsset } from '@/types/Wallet';
import { asEvmChainDetails, asMiddlewareChain } from '@/utils';

import { TransferCrypto } from '../PearlWallet';

export const FundPearlWallet = () => {
  const { goto } = usePageState();
  const { selectedAgentConfig } = useServices();
  const { masterEoaGasRequirement } = useMasterBalances();
  const { masterEoa } = useMasterWalletContext();

  const homeChainId = selectedAgentConfig.evmHomeChainId;
  const { nativeToken } = CHAIN_CONFIG[homeChainId];

  const tokenAndDepositedAmounts = useMemo<AvailableAsset[]>(() => {
    if (!masterEoaGasRequirement) return [];

    return [
      {
        symbol: nativeToken.symbol,
        amount: masterEoaGasRequirement,
      },
    ];
  }, [masterEoaGasRequirement, nativeToken]);

  if (!masterEoa) return null;

  const chainName = asEvmChainDetails(
    asMiddlewareChain(homeChainId),
  ).displayName;

  return (
    <TransferCrypto
      description={`Send funds from your external wallet to the Pearl Wallet address below. When you’re done, you can leave this screen — after the transfer confirms on ${chainName}, your Pearl Wallet balance updates automatically.`}
      chainName={chainName}
      address={masterEoa.address}
      tokensToDeposit={tokenAndDepositedAmounts}
      onBack={() => goto(Pages.Main)}
      onBackToPearlWallet={() => goto(Pages.PearlWallet)}
      requestedColumnText="Total Amount Required"
    />
  );
};
