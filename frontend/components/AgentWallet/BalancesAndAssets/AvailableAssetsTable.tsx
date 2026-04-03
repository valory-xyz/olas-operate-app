import { useMemo } from 'react';

import { WalletAvailableAssetsTable } from '@/components/ui';
import { TOKEN_CONFIG, TokenType } from '@/config/tokens';
import { useService, useServiceBalances, useServices } from '@/hooks';

import { useAgentWallet } from '../AgentWalletProvider';

export const AvailableAssetsTable = () => {
  const { isLoading, availableAssets } = useAgentWallet();
  const { selectedAgentConfig, selectedService } = useServices();
  const { serviceEoa, getServiceSafeOf } = useService(
    selectedService?.service_config_id,
  );
  const { serviceSafeNativeBalances, serviceEoaNativeBalance } =
    useServiceBalances(selectedService?.service_config_id);

  const nativeTokenSymbol = useMemo(() => {
    const tokenConfig = TOKEN_CONFIG[selectedAgentConfig.evmHomeChainId];
    const nativeTokenEntry = Object.values(tokenConfig).find(
      (tokenConfigItem) => tokenConfigItem.tokenType === TokenType.NativeGas,
    );
    return nativeTokenEntry?.symbol;
  }, [selectedAgentConfig.evmHomeChainId]);

  const serviceSafe = useMemo(
    () =>
      getServiceSafeOf?.(
        selectedAgentConfig.evmHomeChainId,
        selectedService?.service_config_id,
      ),
    [
      getServiceSafeOf,
      selectedAgentConfig.evmHomeChainId,
      selectedService?.service_config_id,
    ],
  );

  const safeNativeBalance = useMemo(() => {
    if (!nativeTokenSymbol) return 0;

    return (
      serviceSafeNativeBalances?.find(
        (balanceItem) => balanceItem.symbol === nativeTokenSymbol,
      )?.balance ?? 0
    );
  }, [nativeTokenSymbol, serviceSafeNativeBalances]);

  const signerNativeBalance = useMemo(() => {
    if (!nativeTokenSymbol) return 0;
    if (serviceEoaNativeBalance?.symbol !== nativeTokenSymbol) return 0;

    return serviceEoaNativeBalance.balance ?? 0;
  }, [nativeTokenSymbol, serviceEoaNativeBalance]);

  return (
    <WalletAvailableAssetsTable
      isLoading={isLoading}
      availableAssets={availableAssets}
      walletTitle="Agent"
      nativeTokenSymbol={nativeTokenSymbol}
      safeNativeBalance={safeNativeBalance}
      signerNativeBalance={signerNativeBalance}
      safeAddress={serviceSafe?.address}
      signerAddress={serviceEoa?.address}
      middlewareHomeChainId={selectedAgentConfig.middlewareHomeChainId}
    />
  );
};
