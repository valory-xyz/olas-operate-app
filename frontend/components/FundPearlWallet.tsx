import { useEffect, useMemo, useState } from 'react';

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
import {
  asEvmChainDetails,
  asMiddlewareChain,
} from '@/utils/middlewareHelpers';
import { formatUnitsToNumber } from '@/utils/numberFormatters';

type PrefillNavParams = { prefillAmountWei?: string };

export const FundPearlWallet = () => {
  const { goto, navParams, clearNavParams } = usePageState();
  const { selectedAgentConfig } = useServices();
  const { masterEoaGasRequirement } = useMasterBalances();
  const { masterEoa } = useMasterWalletContext();

  const [prefillAmountWei] = useState<string | undefined>(
    () => (navParams as PrefillNavParams).prefillAmountWei,
  );

  useEffect(() => {
    clearNavParams();
  }, [clearNavParams]);

  const homeChainId = selectedAgentConfig.evmHomeChainId;
  const { symbol, decimals } = CHAIN_CONFIG[homeChainId].nativeToken;

  const tokenAndDepositedAmounts = useMemo<AvailableAsset[]>(() => {
    if (prefillAmountWei !== undefined) {
      return [
        {
          symbol,
          amount: formatUnitsToNumber(prefillAmountWei, decimals, 6),
        },
      ];
    }
    if (!masterEoaGasRequirement) return [];
    return [{ symbol, amount: masterEoaGasRequirement }];
  }, [prefillAmountWei, masterEoaGasRequirement, symbol, decimals]);

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
