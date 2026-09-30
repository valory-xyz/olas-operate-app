import { useEffect, useState } from 'react';

import { FundingFlow } from '@/components/FundingFlow';
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

/** The chain an insufficient-gas error named, if the caller passed one. */
const readChain = (params: unknown): MiddlewareChain | undefined => {
  if (!params || typeof params !== 'object') return undefined;
  const value = (params as Record<string, unknown>).chain;
  return typeof value === 'string' && SUPPORTED_CHAINS.includes(value)
    ? (value as MiddlewareChain)
    : undefined;
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
      onTransferCompleted={() => goto(PAGES.PearlWallet)}
    />
  );
};
