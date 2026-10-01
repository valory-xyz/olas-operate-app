import { useState } from 'react';

import { FundingFlow } from '@/components/FundingFlow';
import { isRunLive } from '@/components/FundingFlow/utils';
import { TOKEN_CONFIG } from '@/config/tokens';
import { AddressZero } from '@/constants';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { useFundingRun } from '@/hooks';
import { Address, TokenAmounts } from '@/types';
import { asMiddlewareChain, parseUnits } from '@/utils';

import { Deposit } from './Deposit/Deposit';
import { getEnteredDepositAmounts } from './utils';

type PearlDepositProps = {
  onBack: () => void;
};

/** Amounts to deliver in base units, keyed by token address, as the middleware expects. */
const toDepositAmounts = (
  chainId: keyof typeof TOKEN_CONFIG,
  amounts: TokenAmounts,
): Record<Address, string> =>
  Object.fromEntries(
    Object.entries(amounts).flatMap(([symbol, details]) => {
      const config = TOKEN_CONFIG[chainId][symbol as keyof TokenAmounts];
      if (!config || !details || details.amount <= 0) return [];
      return [
        [
          config.address ?? AddressZero,
          // toFixed would print the float's binary error, a few wei off.
          parseUnits(
            details.amount.toLocaleString('en-US', {
              useGrouping: false,
              maximumFractionDigits: config.decimals,
            }),
            config.decimals,
          ),
        ],
      ];
    }),
  );

export const PearlDeposit = ({ onBack }: PearlDepositProps) => {
  const { walletChainId, amountsToDeposit, gotoPearlWallet } = usePearlWallet();
  const { activeRun } = useFundingRun();
  const [isFundingFlowOpen, setIsFundingFlowOpen] = useState(false);

  // A live run is resumed instead of starting a new deposit. The flow stays
  // open once the run ends, so it can show its completion.
  const hasLiveRun = !!activeRun && isRunLive(activeRun);
  if (hasLiveRun && !isFundingFlowOpen) setIsFundingFlowOpen(true);

  if (!isFundingFlowOpen) {
    return (
      <Deposit onBack={onBack} onContinue={() => setIsFundingFlowOpen(true)} />
    );
  }
  if (!walletChainId) return null;
  return (
    <FundingFlow
      mode="deposit"
      depositAmounts={toDepositAmounts(walletChainId, amountsToDeposit)}
      destinationChain={asMiddlewareChain(walletChainId)}
      fallbackToReceive={getEnteredDepositAmounts(amountsToDeposit)}
      onBack={hasLiveRun ? onBack : () => setIsFundingFlowOpen(false)}
      onTransferCompleted={gotoPearlWallet}
    />
  );
};
