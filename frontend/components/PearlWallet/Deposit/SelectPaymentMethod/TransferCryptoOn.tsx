import { entries } from 'lodash';
import { useMemo } from 'react';

import { TokenSymbol } from '@/constants';
import { AvailableAsset } from '@/types/Wallet';

import { TransferCrypto } from '../../components/TransferCrypto';
import { usePearlWallet } from '../../PearlWalletProvider';
import { STEPS } from '../../types';

type TransferCryptoOnProps = {
  chainName: string;
  onBack: () => void;
};

export const TransferCryptoOn = ({
  chainName,
  onBack,
}: TransferCryptoOnProps) => {
  const { amountsToDeposit, updateStep, masterSafeAddress } = usePearlWallet();

  const tokenAndDepositedAmounts = useMemo<AvailableAsset[]>(
    () =>
      entries(amountsToDeposit).map(([tokenSymbol, amount]) => ({
        symbol: tokenSymbol as TokenSymbol,
        amount,
      })),
    [amountsToDeposit],
  );

  return (
    <TransferCrypto
      chainName={chainName}
      address={masterSafeAddress}
      tokensToDeposit={tokenAndDepositedAmounts}
      onBack={onBack}
      onBackToPearlWallet={() => updateStep(STEPS.PEARL_WALLET_SCREEN)}
    />
  );
};
