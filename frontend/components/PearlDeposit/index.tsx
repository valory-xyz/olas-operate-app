import { useState } from 'react';

import { FundingFlow } from '@/components/FundingFlow';
import { isRunLive } from '@/components/FundingFlow/utils';
import { TOKEN_CONFIG } from '@/config/tokens';
import { AddressZero } from '@/constants';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { useFundingRun } from '@/hooks';
import { Address, TokenAmounts, ValueOf } from '@/types';
import { asMiddlewareChain, parseUnits } from '@/utils';

import { Deposit } from './Deposit/Deposit';
import { getNetDepositAmounts } from './utils';

const PEARL_DEPOSIT_STEPS = {
  DEPOSIT: 'DEPOSIT',
  FUNDING_FLOW: 'FUNDING_FLOW',
} as const;

type PearlDepositProps = {
  onBack: () => void;
};

/** Target balances in base units, keyed by token address, as the middleware expects. */
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
  const { walletChainId, amountsToDeposit, availableAssets, gotoPearlWallet } =
    usePearlWallet();
  const { activeRun } = useFundingRun();
  const [step, setStep] = useState<ValueOf<typeof PEARL_DEPOSIT_STEPS>>(
    PEARL_DEPOSIT_STEPS.DEPOSIT,
  );

  // A live run is resumed instead of starting a new deposit. The step stays
  // latched once the run ends, so the flow can show its completion.
  const hasLiveRun = isRunLive(activeRun);
  if (hasLiveRun && step !== PEARL_DEPOSIT_STEPS.FUNDING_FLOW) {
    setStep(PEARL_DEPOSIT_STEPS.FUNDING_FLOW);
  }

  switch (step) {
    case PEARL_DEPOSIT_STEPS.DEPOSIT:
      return (
        <Deposit
          onBack={onBack}
          onContinue={() => setStep(PEARL_DEPOSIT_STEPS.FUNDING_FLOW)}
        />
      );
    case PEARL_DEPOSIT_STEPS.FUNDING_FLOW:
      if (!walletChainId) return null;
      return (
        <FundingFlow
          mode="deposit"
          depositAmounts={toDepositAmounts(walletChainId, amountsToDeposit)}
          destinationChain={asMiddlewareChain(walletChainId)}
          fallbackToReceive={getNetDepositAmounts(
            amountsToDeposit,
            availableAssets,
          )}
          onBack={
            hasLiveRun ? onBack : () => setStep(PEARL_DEPOSIT_STEPS.DEPOSIT)
          }
          onTransferCompleted={gotoPearlWallet}
        />
      );
    default:
      throw new Error('Invalid step');
  }
};
