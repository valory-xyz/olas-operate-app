import {
  QueryClient,
  queryOptions,
  skipToken,
  useQuery,
} from '@tanstack/react-query';
import { ethers } from 'ethers';

import {
  isRetiredStakingProgram,
  STAKING_PROGRAMS,
} from '@/config/stakingPrograms';
import {
  EvmChainId,
  POLY_SAFE_PROXY_CODEHASH,
  PROVIDERS,
  REACT_QUERY_KEYS,
} from '@/constants';
import { Address } from '@/types';
import { asEvmChainId } from '@/utils/middlewareHelpers';
import { isInWithdrawalOnlyMode } from '@/utils/service';
import {
  chainHasPolySafePrograms,
  RetiredSafeState,
  toRetiredSafeState,
} from '@/utils/stakingProgram';

import { useServices } from './useServices';
import { useStakingProgram } from './useStakingProgram';

/** Whether `multisig` is a PolySafe proxy, by codehash; one cache entry for the hook and Auto-run. */
const polySafeMultisigQuery = (evmChainId: EvmChainId, multisig?: Address) =>
  queryOptions({
    queryKey: REACT_QUERY_KEYS.MULTISIG_CODEHASH_KEY(
      evmChainId,
      multisig ?? '',
    ),
    queryFn: multisig
      ? async () => {
          try {
            const code = await PROVIDERS[evmChainId].provider.getCode(multisig);
            return ethers.utils.keccak256(code) === POLY_SAFE_PROXY_CODEHASH;
          } catch (error) {
            // Not logged anywhere else, and it blocks a retired-program start.
            console.error(
              `Couldn't read the Safe type of multisig ${multisig} on chain ${evmChainId}:`,
              error,
            );
            throw error;
          }
        }
      : skipToken,
    // The multisig bytecode never changes — keep the answer for the session
    // and don't stall the staking page behind exponential-backoff retries.
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });

/** Whether any service is a PolySafe one, by codehash (Auto-run); rejects when unreadable. */
export const fetchIsPolySafeService = async (
  queryClient: QueryClient,
  evmChainId: EvmChainId,
  multisig?: Address,
): Promise<boolean> => {
  if (!chainHasPolySafePrograms(STAKING_PROGRAMS[evmChainId])) return false;
  if (!multisig) return false;
  return queryClient.fetchQuery(polySafeMultisigQuery(evmChainId, multisig));
};

/** What is known of the selected service's multisig. */
type SafeType = 'loading' | 'error' | 'polySafe' | 'standard';

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
 *    On RPC failure `isMultisigTypeError` is set instead of a guess.
 *
 * `isOnRetiredProgram` and `retiredSafeState` follow
 * docs/features/staking-and-rewards.md ("Retired staking programs").
 */
export const useIsPolySafeService = () => {
  const { selectedService, selectedAgentConfig } = useServices();
  const {
    activeStakingProgramId,
    isActiveStakingProgramLoaded,
    selectedStakingProgramId,
  } = useStakingProgram();

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
    errorUpdateCount,
    isFetching,
    refetch,
  } = useQuery({
    ...polySafeMultisigQuery(evmChainId, multisig),
    enabled: shouldQueryCodehash,
  });

  const safeType = ((): SafeType => {
    if (!hasPolySafePrograms) return 'standard';
    if (!isActiveStakingProgramLoaded) return 'loading';
    if (activeProgram) {
      return activeProgram.requiresPolySafe ? 'polySafe' : 'standard';
    }
    if (!multisig) return 'standard';
    // Only data decides the type. A retry after a failure resets the query to
    // pending, which must not read as "standard".
    if (isPolySafeFromCodehash === undefined) {
      return errorUpdateCount > 0 ? 'error' : 'loading';
    }
    return isPolySafeFromCodehash ? 'polySafe' : 'standard';
  })();

  const isAlreadyWithdrawalOnly =
    !!selectedService && isInWithdrawalOnlyMode(selectedService);
  const isOnRetiredProgram =
    isAlreadyWithdrawalOnly ||
    isRetiredStakingProgram(
      selectedAgentConfig.evmHomeChainId,
      selectedStakingProgramId,
    );

  const isPolySafeService = safeType === 'polySafe';
  const retiredSafeState = ((): RetiredSafeState => {
    if (isAlreadyWithdrawalOnly) return 'withdrawalOnly';
    // Only a retired program waits on the Safe type.
    if (!isOnRetiredProgram) return 'canSwitch';
    return toRetiredSafeState(safeType);
  })();

  return {
    isPolySafeService,
    isMultisigTypeLoaded: safeType !== 'loading',
    isMultisigTypeError: safeType === 'error',
    isMultisigTypeFetching: isFetching,
    isOnRetiredProgram,
    retiredSafeState,
    refetch,
  };
};
