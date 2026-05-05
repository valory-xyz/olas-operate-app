import { useMemo } from 'react';

import {
  AgentEoa,
  AgentSafe,
  AgentWallet,
  MiddlewareChain,
  WALLET_OWNER,
  WALLET_TYPE,
} from '@/constants';
import { MiddlewareServiceResponse, Optional } from '@/types';
import { asEvmChainId } from '@/utils';

/**
 * Derives agent wallets (EOAs + Safes) from all services.
 * Each service may have multiple chain configs, each with instances and a multisig.
 */
export const useServiceWallets = (
  services: MiddlewareServiceResponse[] | undefined,
  isLoading: boolean,
): Optional<AgentWallet[]> => {
  return useMemo(() => {
    if (isLoading) return;
    if (!services?.length) return [];

    return services.reduce<AgentWallet[]>((acc, service) => {
      return [
        ...acc,
        ...Object.keys(service.chain_configs).reduce(
          (acc: AgentWallet[], middlewareChain: string) => {
            const chainConfig =
              service.chain_configs[middlewareChain as MiddlewareChain];

            if (!chainConfig) return acc;

            const instances = chainConfig.chain_data.instances;
            const multisig = chainConfig.chain_data.multisig;

            if (instances) {
              acc.push(
                ...instances.map(
                  (instance: string) =>
                    ({
                      address: instance as `0x${string}`,
                      type: WALLET_TYPE.EOA,
                      owner: WALLET_OWNER.Agent,
                    }) satisfies AgentEoa,
                ),
              );
            }

            if (multisig) {
              acc.push({
                address: multisig,
                type: WALLET_TYPE.Safe,
                owner: WALLET_OWNER.Agent,
                evmChainId: asEvmChainId(middlewareChain),
              } satisfies AgentSafe);
            }

            return acc;
          },
          [],
        ),
      ];
    }, []);
  }, [isLoading, services]);
};
