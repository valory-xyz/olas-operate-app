import { usePearlWallet } from '@/context/PearlWalletProvider';
import { useTransactionHistory } from '@/hooks/useTransactionHistory';

import { TransactionHistoryView } from './TransactionHistoryView';

export const TransactionHistory = () => {
  const { walletChainId, masterSafeAddress } = usePearlWallet();

  const chainId = walletChainId ?? undefined;
  const { rows, isFetched, isLoading, isError, isUnavailable, isDataDelayed } =
    useTransactionHistory({
      chainId,
      masterSafe: masterSafeAddress ?? undefined,
    });

  // Don't render the section pre-Safe — VLOP-73 acceptance criterion.
  if (!masterSafeAddress) return null;

  return (
    <TransactionHistoryView
      chainId={chainId}
      rows={rows}
      isFetched={isFetched}
      isLoading={isLoading}
      isError={isError}
      isUnavailable={isUnavailable}
      isDataDelayed={isDataDelayed}
      resetKey={`${chainId}:${masterSafeAddress}`}
      tooltip="Recent activity for your Pearl Wallet on this chain."
    />
  );
};
