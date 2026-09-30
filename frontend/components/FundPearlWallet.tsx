import { Flex } from 'antd';
import { useEffect, useState } from 'react';

import { FundingFlow } from '@/components/FundingFlow';
import { Alert, BackButton, cardStyles } from '@/components/ui';
import { CHAIN_CONFIG } from '@/config/chains';
import {
  MiddlewareChain,
  PAGES,
  SupportedMiddlewareChainMap,
} from '@/constants';
import { useMasterBalances, usePageState, useServices } from '@/hooks';
import { asMiddlewareChain } from '@/utils/middlewareHelpers';

const SUPPORTED_CHAINS: readonly string[] = Object.values(
  SupportedMiddlewareChainMap,
);

export const UNSUPPORTED_CHAIN_ERROR =
  "Pearl can't top up the Pearl Wallet on this chain. Please contact support.";

const readChain = (
  params: unknown,
): MiddlewareChain | 'unsupported' | undefined => {
  if (!params || typeof params !== 'object') return undefined;
  const value = (params as Record<string, unknown>).chain;
  if (value === undefined) return undefined;
  return typeof value === 'string' && SUPPORTED_CHAINS.includes(value)
    ? (value as MiddlewareChain)
    : 'unsupported';
};

/**
 * Tops up the Pearl Signer's gas reserve through the funding flow. The
 * middleware derives the reserve itself, so no amount is passed in.
 */
export const FundPearlWallet = () => {
  const { goto, navParams, clearNavParams } = usePageState();
  const { selectedAgentConfig } = useServices();
  const { masterEoaGasRequirement } = useMasterBalances();

  const [navChain] = useState(() => readChain(navParams));

  useEffect(() => {
    clearNavParams();
  }, [clearNavParams]);

  // Topping up the home chain instead would leave the named chain short.
  if (navChain === 'unsupported') {
    return (
      <Flex vertical gap={16} style={cardStyles}>
        <BackButton onPrev={() => goto(PAGES.Main)} />
        <Alert type="error" showIcon message={UNSUPPORTED_CHAIN_ERROR} />
      </Flex>
    );
  }

  const homeChainId = selectedAgentConfig.evmHomeChainId;
  const destinationChain = navChain ?? asMiddlewareChain(homeChainId);
  const isHomeChain = destinationChain === asMiddlewareChain(homeChainId);

  return (
    <FundingFlow
      mode="signer_gas"
      destinationChain={destinationChain}
      fallbackToReceive={
        isHomeChain && masterEoaGasRequirement
          ? [
              {
                symbol: CHAIN_CONFIG[homeChainId].nativeToken.symbol,
                amount: masterEoaGasRequirement,
              },
            ]
          : undefined
      }
      onBack={() => goto(PAGES.Main)}
      onBackToPearlWallet={() => goto(PAGES.PearlWallet)}
      onTransferCompleted={() => goto(PAGES.PearlWallet)}
    />
  );
};
