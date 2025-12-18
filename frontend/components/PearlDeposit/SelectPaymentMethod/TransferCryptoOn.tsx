import { entries } from 'lodash';
import { useMemo } from 'react';

import { TransferCryptoFromExternalWallet } from '@/components/PearlWallet';
import { TokenSymbol } from '@/config/tokens';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { AvailableAsset } from '@/types/Wallet';

type TransferCryptoOnProps = {
  chainName: string;
  onBack: () => void;
};

export const TransferCryptoOn = ({
  chainName,
  onBack,
}: TransferCryptoOnProps) => {
  const { amountsToDeposit, masterSafeAddress, gotoPearlWallet } =
    usePearlWallet();

  const tokenAndDepositedAmounts = useMemo<AvailableAsset[]>(
    () =>
      entries(amountsToDeposit).map(([tokenSymbol, { amount }]) => ({
        symbol: tokenSymbol as TokenSymbol,
        amount,
      })),
    [amountsToDeposit],
  );

  return (
    <TransferCryptoFromExternalWallet
      description={`Send the specified amounts from your external wallet to the Pearl Wallet address below. When you’re done, you can leave this screen — after the transfer confirms on ${chainName}, your Pearl Wallet balance updates automatically.`}
      chainName={chainName}
      address={masterSafeAddress}
      tokensToDeposit={tokenAndDepositedAmounts}
      onBack={onBack}
      onBackToPearlWallet={gotoPearlWallet}
    />
  );
};
