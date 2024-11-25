import { useQuery } from '@tanstack/react-query';
import { Contract } from 'ethers';
import { Contract as MulticallContract, ContractCall } from 'ethers-multicall';
import { isEmpty, isNil } from 'lodash';

import { GNOSIS_SAFE_ABI } from '@/abis/gnosisSafe';
import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { PROVIDERS } from '@/constants/providers';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { EvmChainId } from '@/enums/Chain';
import { Safe } from '@/enums/Wallet';
import { Address } from '@/types/Address';

/**
 * Hook to fetch multisig owners
 * @param safe
 * @returns multisig owners
 * @note extend with further multisig functions as needed
 */
export const useMultisig = (safe?: Safe) => {
  const {
    data: owners,
    isFetched: ownersIsFetched,
    // isPending: ownersIsPending,
  } = useQuery<Address[] | null>({
    enabled: !isNil(safe),
    queryKey: safe ? REACT_QUERY_KEYS.MULTISIG_GET_OWNERS_KEY(safe) : [],
    queryFn: async () => {
      if (!safe) {
        return null;
      }
      const contract = new Contract(
        safe.address,
        GNOSIS_SAFE_ABI,
        PROVIDERS[safe.evmChainId].provider,
      );
      return contract.functions.getOwners() as Promise<Address[]>;
    },
    refetchInterval: FIVE_SECONDS_INTERVAL,
  });

  return { owners, ownersIsFetched };
};

type MultisigOwners = {
  safeAddress: Address;
  evmChainId: EvmChainId;
  owners: Address[];
};

/**
 * Hook to fetch from an array of multisigs
 */
export const useMultisigs = (safes?: Safe[]) => {
  const {
    data: masterSafesOwners,
    isFetched: masterSafesOwnersIsFetched,
    isPending: masterSafesOwnersIsPending,
  } = useQuery<MultisigOwners[]>({
    enabled: !isNil(safes) && !isEmpty(safes),
    queryKey: safes ? REACT_QUERY_KEYS.MULTISIGS_GET_OWNERS_KEY(safes) : [],
    queryFn: async (): Promise<MultisigOwners[]> => {
      if (!safes || isEmpty(safes)) return [];

      const contractCallsByChainId: {
        [chainId: number]: {
          safeAddress: string;
          contractCall: ContractCall;
        }[];
      } = {};

      // Step 1: Group safes by chainId and prepare contract calls
      for (const [evmChainIdKey] of Object.entries(PROVIDERS)) {
        const safesOnChainId = safes.filter(
          (safe) => safe.evmChainId === <EvmChainId>+evmChainIdKey,
        );
        if (safesOnChainId.length === 0) {
          continue;
        }

        contractCallsByChainId[<EvmChainId>+evmChainIdKey] = safesOnChainId.map(
          (safe) => ({
            safeAddress: safe.address,
            contractCall: new MulticallContract(
              safe.address,
              GNOSIS_SAFE_ABI,
            ).getOwners(),
          }),
        );
      }

      // Step 2: Execute multicall and gather results
      const output: MultisigOwners[] = [];

      for (const [evmChainIdKey, calls] of Object.entries(
        contractCallsByChainId,
      )) {
        const evmChainId = <EvmChainId>+evmChainIdKey;

        const provider = PROVIDERS[evmChainId]?.multicallProvider;

        if (!provider) {
          console.error(`No provider found for chainId ${evmChainId}`);
          continue;
        }

        // Execute the multicall
        const ownersArray = await provider.all(
          calls.map((call) => call.contractCall),
        );

        // Combine results into the output
        ownersArray.forEach((owners, index) => {
          const safeAddress = <Address>calls[index].safeAddress;
          output.push({
            safeAddress,
            evmChainId,
            owners,
          });
        });
      }

      return output;
    },
    refetchInterval: FIVE_SECONDS_INTERVAL,
  });

  return {
    masterSafesOwners,
    masterSafesOwnersIsFetched,
    masterSafesOwnersIsPending,
  };
};
