import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';

import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import {
  POLY_SAFE_PROXY_CODEHASH,
  PROVIDERS,
  REACT_QUERY_KEYS,
} from '@/constants';
import { Address } from '@/types';
import { asEvmChainId } from '@/utils/middlewareHelpers';
import { chainHasPolySafePrograms } from '@/utils/stakingProgram';

import { useServices } from './useServices';
import { useStakingProgram } from './useStakingProgram';

const NOT_POLY_SAFE = { isPolySafeService: false, isMultisigTypeError: false };

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
 */
export const useIsPolySafeService = () => {
  const { selectedService, selectedAgentConfig } = useServices();
  const { activeStakingProgramId, isActiveStakingProgramLoaded } =
    useStakingProgram();

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
    queryKey: REACT_QUERY_KEYS.MULTISIG_CODEHASH_KEY(
      evmChainId,
      multisig ?? '',
    ),
    queryFn: async () => {
      const code = await PROVIDERS[evmChainId].provider.getCode(
        multisig as Address,
      );
      return ethers.utils.keccak256(code) === POLY_SAFE_PROXY_CODEHASH;
    },
    enabled: shouldQueryCodehash,
    // The multisig bytecode never changes — keep the answer for the session
    // and don't stall the staking page behind exponential-backoff retries.
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });

  if (!hasPolySafePrograms) {
    return { ...NOT_POLY_SAFE, isMultisigTypeLoaded: true, refetch };
  }
  if (!isActiveStakingProgramLoaded) {
    return { ...NOT_POLY_SAFE, isMultisigTypeLoaded: false, refetch };
  }
  if (activeProgram) {
    return {
      isPolySafeService: !!activeProgram.requiresPolySafe,
      isMultisigTypeError: false,
      isMultisigTypeLoaded: true,
      refetch,
    };
  }
  if (!multisig) {
    return { ...NOT_POLY_SAFE, isMultisigTypeLoaded: true, refetch };
  }

  return {
    isPolySafeService: isPolySafeFromCodehash ?? false,
    isMultisigTypeError: isError,
    isMultisigTypeLoaded: isFetched,
    refetch,
  };
};
