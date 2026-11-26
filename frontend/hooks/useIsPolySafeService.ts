import { QueryClient, useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';

import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import {
  EvmChainId,
  POLY_SAFE_PROXY_CODEHASH,
  PROVIDERS,
  REACT_QUERY_KEYS,
} from '@/constants';
import { Address } from '@/types';
import { asEvmChainId } from '@/utils/middlewareHelpers';
import {
  chainHasPolySafePrograms,
  isWithdrawalOnly,
} from '@/utils/stakingProgram';

import { useServices } from './useServices';
import { useStakingProgram } from './useStakingProgram';

const NOT_POLY_SAFE = { isPolySafeService: false, isMultisigTypeError: false };

/**
 * Query for whether `multisig` is a PolySafe proxy, by its codehash. Shared by
 * this hook and Auto-run so both read the same cache entry.
 */
const polySafeMultisigQuery = (evmChainId: EvmChainId, multisig: Address) => ({
  queryKey: REACT_QUERY_KEYS.MULTISIG_CODEHASH_KEY(evmChainId, multisig),
  queryFn: async () => {
    try {
      const code = await PROVIDERS[evmChainId].provider.getCode(multisig);
      return ethers.utils.keccak256(code) === POLY_SAFE_PROXY_CODEHASH;
    } catch (error) {
      // A failure here blocks starting an agent on a retired program, and the
      // query error is not logged anywhere else.
      console.error(
        `Couldn't read the Safe type of multisig ${multisig} on chain ${evmChainId}:`,
        error,
      );
      throw error;
    }
  },
  // The multisig bytecode never changes — keep the answer for the session
  // and don't stall the staking page behind exponential-backoff retries.
  staleTime: Infinity,
  gcTime: Infinity,
  retry: 1,
});

/**
 * Whether any service is a PolySafe one, for callers outside the selected
 * service (Auto-run). Same answer as `useIsPolySafeService`, without its step 2
 * shortcut: the contract enforces the codehash, so the codehash agrees with it.
 * Rejects when the codehash can't be read.
 */
export const fetchIsPolySafeService = async (
  queryClient: QueryClient,
  evmChainId: EvmChainId,
  multisig?: Address,
): Promise<boolean> => {
  if (!chainHasPolySafePrograms(STAKING_PROGRAMS[evmChainId])) return false;
  if (!multisig) return false;
  return queryClient.fetchQuery(polySafeMultisigQuery(evmChainId, multisig));
};

/**
 * Detects whether the selected service was deployed with a PolySafe multisig.
 *
 * Staking contracts pin `service.multisig.codehash`, so a PolySafe service can
 * only stake on `requiresPolySafe` programs and a standard Safe service only
 * on the others. The middleware does not expose the multisig type, so:
 * 1. Chain without `requiresPolySafe` programs → standard Safe, no RPC call.
 * 2. Service staked on-chain → the staked program's flag is proof either way
 *    (the contract enforces the codehash on stake), no RPC call. The
 *    service-stored `staking_program_id` is deliberately NOT used: it is only
 *    the user's choice and may predate a failed stake.
 * 3. Service not deployed yet (no multisig) → standard Safe. The pinned
 *    middleware deploys a standard Safe for every new service.
 * 4. Otherwise `keccak256(getCode(multisig)) === POLY_SAFE_PROXY_CODEHASH`.
 *    On RPC failure `isMultisigTypeError` is set instead of guessing.
 *
 * `isWithdrawalOnly` is the one definition of withdrawal-only mode for the
 * selected service: see `isWithdrawalOnly`.
 */
export const useIsPolySafeService = () => {
  const { selectedService, selectedAgentConfig } = useServices();
  const {
    activeStakingProgramId,
    isActiveStakingProgramLoaded,
    selectedStakingProgramMeta,
  } = useStakingProgram();
  const isRetired = !!selectedStakingProgramMeta?.retired;

  // The multisig lives on the service's home chain, which for multi-chain
  // agents can differ from the agent config's `evmHomeChainId`.
  const evmChainId = selectedService
    ? asEvmChainId(selectedService.home_chain)
    : selectedAgentConfig.evmHomeChainId;
  const programs = STAKING_PROGRAMS[evmChainId];
  const hasPolySafePrograms = chainHasPolySafePrograms(programs);

  const multisig =
    selectedService?.chain_configs?.[selectedService.home_chain]?.chain_data
      ?.multisig;
  const activeProgram = activeStakingProgramId
    ? programs[activeStakingProgramId]
    : undefined;

  const shouldQueryCodehash =
    hasPolySafePrograms &&
    isActiveStakingProgramLoaded &&
    !activeProgram &&
    !!multisig;

  const {
    data: isPolySafeFromCodehash,
    isFetched,
    isError,
    refetch,
  } = useQuery({
    ...polySafeMultisigQuery(evmChainId, (multisig ?? '') as Address),
    enabled: shouldQueryCodehash,
  });

  const withWithdrawalOnly = <T extends { isPolySafeService: boolean }>(
    result: T,
  ) => ({
    ...result,
    isWithdrawalOnly: isWithdrawalOnly({
      isRetired,
      isPolySafeService: result.isPolySafeService,
    }),
    refetch,
  });

  if (!hasPolySafePrograms) {
    return withWithdrawalOnly({ ...NOT_POLY_SAFE, isMultisigTypeLoaded: true });
  }
  if (!isActiveStakingProgramLoaded) {
    return withWithdrawalOnly({
      ...NOT_POLY_SAFE,
      isMultisigTypeLoaded: false,
    });
  }
  if (activeProgram) {
    return withWithdrawalOnly({
      isPolySafeService: !!activeProgram.requiresPolySafe,
      isMultisigTypeError: false,
      isMultisigTypeLoaded: true,
    });
  }
  if (!multisig) {
    return withWithdrawalOnly({ ...NOT_POLY_SAFE, isMultisigTypeLoaded: true });
  }

  return withWithdrawalOnly({
    isPolySafeService: isPolySafeFromCodehash ?? false,
    isMultisigTypeError: isError,
    isMultisigTypeLoaded: isFetched,
  });
};
