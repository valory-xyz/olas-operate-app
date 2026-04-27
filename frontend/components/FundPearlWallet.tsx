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

type PrefillNavParams = { prefillAmountWei?: number | string };

export const FundPearlWallet = () => {
  const { goto, navParams, clearNavParams } = usePageState();
  const { selectedAgentConfig } = useServices();
  const { masterEoaGasRequirement } = useMasterBalances();
  const { masterEoa } = useMasterWalletContext();

  // Order matters: the `useState` initialiser reads navParams on first render,
  // then the `useEffect` below clears navParams. If these are reordered (or if
  // anyone adds an early `if (!masterEoa) return null` before the hooks), the
  // prefill will be lost. The hook order is load-bearing — do not move.
  const [prefillAmountWei] = useState<number | string | undefined>(
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
          amount: formatUnitsToNumber(String(prefillAmountWei), decimals, 6),
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
