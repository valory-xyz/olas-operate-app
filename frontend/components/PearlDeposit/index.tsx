import { useState } from 'react';

import { FundingFlow } from '@/components/FundingFlow';
import { CANCEL_FAILED } from '@/components/FundingFlow/constants';
import { isRunEditable, isRunStarted } from '@/components/FundingFlow/utils';
import { TOKEN_CONFIG } from '@/config/tokens';
import { AddressZero } from '@/constants';
import { useMessageApi } from '@/context/MessageProvider';
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
  const { activeRun, cancelIfOnlyQuoted } = useFundingRun();
  const message = useMessageApi();
  const [isFundingFlowOpen, setIsFundingFlowOpen] = useState(false);
  const [isDiscardingRun, setIsDiscardingRun] = useState(false);

  // A started run is resumed; the flow stays open once it ends, to show its completion.
  const hasStartedRun = !!activeRun && isRunStarted(activeRun);
  if (hasStartedRun && !isFundingFlowOpen) setIsFundingFlowOpen(true);

  // A quoted run was for amounts entered earlier, so a new deposit replaces it.
  const handleContinue = () => {
    if (activeRun && isRunEditable(activeRun) && !isRunStarted(activeRun)) {
      setIsDiscardingRun(true);
      cancelIfOnlyQuoted(activeRun.id)
        .then(
          () => setIsFundingFlowOpen(true),
          () => message.error(CANCEL_FAILED),
        )
        .finally(() => setIsDiscardingRun(false));
      return;
    }
    setIsFundingFlowOpen(true);
  };

  if (!isFundingFlowOpen) {
    return (
      <Deposit
        onBack={onBack}
        onContinue={handleContinue}
        isContinuing={isDiscardingRun}
      />
    );
  }
  if (!walletChainId) return null;
  return (
    <FundingFlow
      mode="deposit"
      depositAmounts={toDepositAmounts(walletChainId, amountsToDeposit)}
      destinationChain={asMiddlewareChain(walletChainId)}
      fallbackToReceive={getEnteredDepositAmounts(amountsToDeposit)}
      onBack={hasStartedRun ? onBack : () => setIsFundingFlowOpen(false)}
      onTransferCompleted={gotoPearlWallet}
    />
  );
};
