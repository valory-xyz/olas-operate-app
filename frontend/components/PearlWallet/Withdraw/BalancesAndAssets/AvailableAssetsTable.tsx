import { useMemo } from 'react';

import { WalletAvailableAssetsTable } from '@/components/ui';
import { TOKEN_CONFIG, TokenType } from '@/config/tokens';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { useMasterBalances, useMasterWalletContext } from '@/hooks';
import { asMiddlewareChain } from '@/utils';

export const AvailableAssetsTable = () => {
  const { isLoading, availableAssets, walletChainId } = usePearlWallet();
  const { masterEoa, getMasterSafeOf } = useMasterWalletContext();
  const { getMasterSafeNativeBalanceOf, getMasterEoaNativeBalanceOf } =
    useMasterBalances();

  const nativeTokenSymbol = useMemo(() => {
    if (!walletChainId) return undefined;

    const tokenConfig = TOKEN_CONFIG[walletChainId];
    const nativeTokenEntry = Object.values(tokenConfig).find(
      (tokenConfigItem) => tokenConfigItem.tokenType === TokenType.NativeGas,
    );
    return nativeTokenEntry?.symbol;
  }, [walletChainId]);

  const safeNativeBalance = useMemo(() => {
    if (!walletChainId || !nativeTokenSymbol) return 0;

    return (
      getMasterSafeNativeBalanceOf(walletChainId)?.find(
        (balanceItem) => balanceItem.symbol === nativeTokenSymbol,
      )?.balance ?? 0
    );
  }, [getMasterSafeNativeBalanceOf, nativeTokenSymbol, walletChainId]);

  const signerNativeBalance = useMemo(() => {
    if (!walletChainId || !nativeTokenSymbol) return 0;

    return Number(getMasterEoaNativeBalanceOf(walletChainId) ?? '0');
  }, [getMasterEoaNativeBalanceOf, nativeTokenSymbol, walletChainId]);

  const masterSafe = walletChainId ? getMasterSafeOf?.(walletChainId) : null;

  return (
    <WalletAvailableAssetsTable
      isLoading={isLoading}
      availableAssets={availableAssets}
      walletTitle="Pearl"
      nativeTokenSymbol={nativeTokenSymbol}
      safeNativeBalance={safeNativeBalance}
      signerNativeBalance={signerNativeBalance}
      safeAddress={masterSafe?.address}
      signerAddress={masterEoa?.address}
      middlewareHomeChainId={
        walletChainId ? asMiddlewareChain(walletChainId) : undefined
      }
    />
  );
};
