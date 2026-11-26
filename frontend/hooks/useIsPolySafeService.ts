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
  isWithdrawalOnly,
} from '@/utils/stakingProgram';

import { useServices } from './useServices';
import { useStakingProgram } from './useStakingProgram';

/**
 * Query for whether `multisig` is a PolySafe proxy, by its codehash. Shared by
 * this hook and Auto-run so both read the same cache entry.
 */
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
            // A failure here blocks starting an agent on a retired program, and
            // the query error is not logged anywhere else.
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

/** What is known of the selected service's multisig. */
export type SafeType = 'loading' | 'error' | 'polySafe' | 'standard';

/**
 * Detects whether the selected service was deployed with a PolySafe multisig,
 * and whether it is in withdrawal-only mode.
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
 *    On RPC failure `safeType` is `'error'` instead of a guess.
 *
 * `isOnRetiredProgram`: the selected program is retired, or the service was
 * already started withdrawal-only (stored as `no_staking`, so the retired id
 * is gone once the middleware has unstaked it).
 *
 * `isWithdrawalOnly`: `true` for a service already in withdrawal-only mode, or
 * a PolySafe one on a retired program (`isWithdrawalOnly` rule); `false` when
 * it is not; `undefined` while that depends on a Safe type that is loading or couldn't be read.
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
    isFetched,
    isError,
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
    if (isError) return 'error';
    if (!isFetched) return 'loading';
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

  const isWithdrawalOnlyService = ((): boolean | undefined => {
    if (isAlreadyWithdrawalOnly) return true;
    if (!isOnRetiredProgram) return false;
    if (safeType === 'loading' || safeType === 'error') return undefined;
    return isWithdrawalOnly({
      isRetired: true,
      isPolySafeService: safeType === 'polySafe',
    });
  })();

  return {
    safeType,
    isPolySafeService: safeType === 'polySafe',
    isMultisigTypeLoaded: safeType !== 'loading',
    isMultisigTypeError: safeType === 'error',
    isOnRetiredProgram,
    isWithdrawalOnly: isWithdrawalOnlyService,
    refetch,
  };
};
