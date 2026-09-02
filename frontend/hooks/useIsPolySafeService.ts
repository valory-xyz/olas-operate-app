import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';

import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import {
  POLY_SAFE_PROXY_CODEHASH,
  PROVIDERS,
  REACT_QUERY_KEYS,
  StakingProgramId,
} from '@/constants';
import { Address } from '@/types';
import { chainHasPolySafePrograms } from '@/utils/stakingProgram';

import { useServices } from './useServices';
import { useStakingProgram } from './useStakingProgram';

/**
 * Detects whether the selected service was deployed with a PolySafe multisig.
 *
 * Staking contracts pin `service.multisig.codehash`, so a PolySafe service can
 * only stake on `requiresPolySafe` programs and a standard Safe service only
 * on the others. The middleware does not expose the multisig type, so:
 * 1. Chains without `requiresPolySafe` programs → `false`, no RPC call.
 * 2. Service staked in / storing a `requiresPolySafe` program → `true`, no RPC
 *    call (the contract enforces this on stake).
 * 3. Service not deployed yet (no multisig) → `false`. The pinned middleware
 *    deploys a standard Safe for every new service.
 * 4. Otherwise `keccak256(getCode(multisig)) === POLY_SAFE_PROXY_CODEHASH`.
 */
export const useIsPolySafeService = () => {
  const { selectedService, selectedAgentConfig } = useServices();
  const { activeStakingProgramId, isActiveStakingProgramLoaded } =
    useStakingProgram();
  const { evmHomeChainId } = selectedAgentConfig;

  const programs = STAKING_PROGRAMS[evmHomeChainId];
  const hasPolySafePrograms = chainHasPolySafePrograms(programs);

  const chainData =
    selectedService?.chain_configs?.[selectedService?.home_chain]?.chain_data;
  const multisig = chainData?.multisig;
  const storedStakingProgramId = chainData?.user_params?.staking_program_id;

  const isKnownPolySafeFromProgram = [
    activeStakingProgramId,
    storedStakingProgramId,
  ].some(
    (id: StakingProgramId | null | undefined) =>
      !!id && !!programs[id]?.requiresPolySafe,
  );

  const shouldQueryCodehash =
    hasPolySafePrograms &&
    isActiveStakingProgramLoaded &&
    !isKnownPolySafeFromProgram &&
    !!multisig;

  const { data: isPolySafeFromCodehash, isFetched } = useQuery({
    queryKey: REACT_QUERY_KEYS.MULTISIG_CODEHASH_KEY(
      evmHomeChainId,
      multisig ?? '',
    ),
    queryFn: async () => {
      const code = await PROVIDERS[evmHomeChainId].provider.getCode(
        multisig as Address,
      );
      return ethers.utils.keccak256(code) === POLY_SAFE_PROXY_CODEHASH;
    },
    enabled: shouldQueryCodehash,
    // The multisig bytecode never changes — fetch once per session.
    staleTime: Infinity,
  });

  if (!hasPolySafePrograms) {
    return { isPolySafeService: false, isMultisigTypeLoaded: true };
  }
  if (isKnownPolySafeFromProgram) {
    return { isPolySafeService: true, isMultisigTypeLoaded: true };
  }
  if (!isActiveStakingProgramLoaded) {
    return { isPolySafeService: false, isMultisigTypeLoaded: false };
  }
  if (!multisig) {
    return { isPolySafeService: false, isMultisigTypeLoaded: true };
  }

  // On RPC failure (`isFetched` with no data) fall back to "standard Safe" so
  // the contract list never stays empty without explanation.
  return {
    isPolySafeService: isPolySafeFromCodehash ?? false,
    isMultisigTypeLoaded: isFetched,
  };
};
