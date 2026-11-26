import type {
  StakingProgramConfig,
  StakingProgramMap,
} from '@/config/stakingPrograms';
import type { AgentType, StakingProgramId } from '@/constants';
import {
  NO_STAKING_PROGRAM_ID,
  RETIRED_STAKING_PROGRAM_COPY,
} from '@/constants/stakingProgram';
import { Address, Nullable } from '@/types';
import { formatToShortDateTime } from '@/utils/time';

/**
 * Given an address, returns a normalized staking program ID by lowercasing the address
 *
 * @example 0xAbC123... -> 0x000000000000000000000000abc123...
 */
export const deriveStakingProgramId = (address: Address): string => {
  const normalized = address.toLowerCase().replace(/^0x/, '');
  return `0x${normalized.padStart(64, '0')}`;
};

/**
 * Whether a service runs without staking (Connect). Such agents have no
 * staking contract or epoch, so staking reads and the staking KPI do not apply.
 */
export const isNoStakingProgram = (
  stakingProgramId: Nullable<StakingProgramId> | undefined,
): stakingProgramId is typeof NO_STAKING_PROGRAM_ID =>
  stakingProgramId === NO_STAKING_PROGRAM_ID;

/** Whether any program on the chain only accepts PolySafe-deployed services. */
export const chainHasPolySafePrograms = (programs: StakingProgramMap) =>
  Object.values(programs).some((program) => program.requiresPolySafe);

/**
 * Whether the service multisig type matches what the staking contract accepts.
 * Contracts pin `service.multisig.codehash`, so a PolySafe service can only
 * stake on `requiresPolySafe` programs and a standard Safe service only on the
 * others.
 */
export const isStakingProgramCompatibleWithMultisig = (
  program: Pick<StakingProgramConfig, 'requiresPolySafe'>,
  isPolySafeService: boolean,
) => !!program.requiresPolySafe === isPolySafeService;

type GetCompatibleStakingProgramIdsParams = {
  /** Staking programs of the agent's home chain. */
  programs: StakingProgramMap;
  agentType: AgentType;
  /** Whether the selected service was deployed with a PolySafe multisig. */
  isPolySafeService: boolean;
  /** Program the service is currently staked in (or has stored), if any. */
  currentStakingProgramId: Nullable<StakingProgramId>;
};

/**
 * Ordered list of staking programs the user may select:
 * 1. The current program first — even if deprecated, retired or incompatible, the user
 *    must be able to see the contract they are actually staked in.
 * 2. Deprecated and retired programs are hidden.
 * 3. Programs not supporting the agent type are hidden.
 * 4. Programs whose multisig requirement doesn't match the service are hidden
 *    (the contract would reject the stake transaction anyway).
 */
export const getCompatibleStakingProgramIds = ({
  programs,
  agentType,
  isPolySafeService,
  currentStakingProgramId,
}: GetCompatibleStakingProgramIdsParams): StakingProgramId[] =>
  Object.entries(programs).reduce<StakingProgramId[]>((acc, [id, program]) => {
    const stakingProgramId = id as StakingProgramId;

    if (stakingProgramId === currentStakingProgramId) {
      return [stakingProgramId, ...acc];
    }
    if (program.deprecated || program.retired) return acc;
    if (!program.agentsSupported.includes(agentType)) return acc;
    if (!isStakingProgramCompatibleWithMultisig(program, isPolySafeService)) {
      return acc;
    }

    return [...acc, stakingProgramId];
  }, []);

/**
 * Time a start may take, so a start that begins this close to the end of an
 * eviction is treated as one that re-stakes.
 */
export const EVICTION_RUN_START_MARGIN_SECONDS = 30 * 60;

/**
 * Whether an agent that can run evicted starts inside its eviction window, with
 * enough of it left that the start cannot turn into a re-stake. Such a run does
 * not re-stake, so it needs no free slot.
 */
export const runsInsideEvictionWindow = ({
  isAgentEvicted,
  canRunWhileEvicted,
  evictionExpiresAt,
  nowSeconds,
}: {
  isAgentEvicted: boolean;
  canRunWhileEvicted: boolean | undefined;
  /** When the eviction ends, in seconds; 0 when unknown. */
  evictionExpiresAt: number;
  nowSeconds: number;
}): boolean =>
  isAgentEvicted &&
  !!canRunWhileEvicted &&
  evictionExpiresAt - nowSeconds > EVICTION_RUN_START_MARGIN_SECONDS;

/** A PolySafe can't switch off a retired program (no live one accepts it), so it only withdraws. */
export const computeIsWithdrawalOnly = ({
  isRetired,
  isPolySafeService,
}: {
  isRetired: boolean;
  isPolySafeService: boolean;
}) => isRetired && isPolySafeService;

/** What is known of a service's place in its staking contract. */
export type RetiredProgramStakingDetails =
  | { state: 'loading' }
  | { state: 'error' }
  | { state: 'loaded'; placement: 'inMinimumPeriod'; cooldownEndsAt: number }
  | { state: 'loaded'; placement: 'pastMinimumPeriod' | 'outOfContract' };

/** The loaded details, from the contract's reads; `cooldownEndsAt` in seconds. */
export const getLoadedRetiredProgramStakingDetails = ({
  isServiceInContract,
  isServiceStakedForMinimumDuration,
  cooldownEndsAt,
}: {
  isServiceInContract: boolean;
  isServiceStakedForMinimumDuration: boolean;
  cooldownEndsAt: number;
}): RetiredProgramStakingDetails => {
  if (!isServiceInContract)
    return { state: 'loaded', placement: 'outOfContract' };
  return isServiceStakedForMinimumDuration
    ? { state: 'loaded', placement: 'pastMinimumPeriod' }
    : { state: 'loaded', placement: 'inMinimumPeriod', cooldownEndsAt };
};

/** What can be said about a service on a retired program; `endsAt` in seconds. */
export type RetiredProgramStatus =
  | { kind: 'withdrawalOnly' }
  | { kind: 'cooldown'; endsAt: number }
  | { kind: 'safeTypeUnknown' }
  | { kind: 'safeTypeLoading' }
  | { kind: 'stakingDetailsUnknown' }
  | { kind: 'stakingDetailsLoading' }
  | { kind: 'awaitingUnstake' }
  | { kind: 'switch' };

/** Classifies a service on a retired program for the alert and the start gate. */
export const getRetiredProgramStatus = ({
  isWithdrawalOnly,
  isSafeTypeError,
  stakingDetails,
}: {
  /** `undefined` while the Safe type is loading or couldn't be read. */
  isWithdrawalOnly: boolean | undefined;
  isSafeTypeError: boolean;
  stakingDetails: RetiredProgramStakingDetails;
}): RetiredProgramStatus => {
  if (isWithdrawalOnly === true) return { kind: 'withdrawalOnly' };
  if (
    stakingDetails.state === 'loaded' &&
    stakingDetails.placement === 'inMinimumPeriod'
  ) {
    return { kind: 'cooldown', endsAt: stakingDetails.cooldownEndsAt };
  }
  if (isWithdrawalOnly === undefined) {
    return { kind: isSafeTypeError ? 'safeTypeUnknown' : 'safeTypeLoading' };
  }
  if (stakingDetails.state === 'error')
    return { kind: 'stakingDetailsUnknown' };
  if (stakingDetails.state === 'loading') {
    return { kind: 'stakingDetailsLoading' };
  }
  return {
    kind:
      stakingDetails.placement === 'outOfContract'
        ? 'switch'
        : 'awaitingUnstake',
  };
};

/** The alert's copy for a status, as a start-gate or Auto-run reason; `null` while loading. */
export const getRetiredProgramReason = (
  status: RetiredProgramStatus,
): string | null => {
  switch (status.kind) {
    case 'withdrawalOnly':
      return RETIRED_STAKING_PROGRAM_COPY.WITHDRAWAL_ONLY;
    case 'cooldown':
      return `${RETIRED_STAKING_PROGRAM_COPY.COOLDOWN_PREFIX} ${formatToShortDateTime(status.endsAt * 1000)} (UTC)${RETIRED_STAKING_PROGRAM_COPY.COOLDOWN_SUFFIX}`;
    case 'safeTypeUnknown':
      return RETIRED_STAKING_PROGRAM_COPY.SAFE_TYPE_UNKNOWN;
    case 'stakingDetailsUnknown':
      return RETIRED_STAKING_PROGRAM_COPY.STAKING_DETAILS_UNKNOWN;
    case 'safeTypeLoading':
    case 'stakingDetailsLoading':
      return null;
    case 'awaitingUnstake':
    case 'switch':
      return RETIRED_STAKING_PROGRAM_COPY.SWITCH;
  }
};
