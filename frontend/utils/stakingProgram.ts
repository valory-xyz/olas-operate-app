import { isNil } from 'lodash';

import type {
  StakingProgramConfig,
  StakingProgramMap,
} from '@/config/stakingPrograms';
import type { AgentType, EvmChainId } from '@/constants';
import {
  NO_STAKING_PROGRAM_ID,
  RETIRED_STAKING_PROGRAM_COPY,
  type StakingProgramId,
} from '@/constants/stakingProgram';
import {
  Address,
  AgentConfig,
  MiddlewareServiceResponse,
  Nullable,
  StakingContractDetails,
} from '@/types';
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
 * Whether the program id is the Unstaked choice (`no_staking`): no staking
 * contract or epoch applies, so staking reads and the staking KPI do not.
 */
export const isNoStakingProgram = (
  stakingProgramId: Nullable<StakingProgramId> | undefined,
): stakingProgramId is typeof NO_STAKING_PROGRAM_ID =>
  stakingProgramId === NO_STAKING_PROGRAM_ID;

/**
 * Whether an instance of the agent on `chainId` can stake. Agents with
 * `stakingChains` (Connect) stake only on those chains; others follow
 * `hasStaking`.
 */
export const isStakingAvailable = (
  agentConfig: Pick<AgentConfig, 'hasStaking' | 'stakingChains'>,
  chainId: EvmChainId,
) =>
  agentConfig.stakingChains
    ? agentConfig.stakingChains.includes(chainId)
    : agentConfig.hasStaking;

/**
 * Whether the agent's contract lists offer an Unstaked option: staking is
 * optional for it (its default is `no_staking`) and possible on this chain.
 */
export const hasUnstakedOption = (
  agentConfig: Pick<
    AgentConfig,
    'hasStaking' | 'stakingChains' | 'defaultStakingProgramId'
  >,
  chainId: EvmChainId,
) =>
  isNoStakingProgram(agentConfig.defaultStakingProgramId) &&
  isStakingAvailable(agentConfig, chainId);

/** The staking program a service has stored for its home chain, if any. */
export const getServiceStakingProgramId = (
  service:
    | Pick<MiddlewareServiceResponse, 'chain_configs' | 'home_chain'>
    | undefined,
): Nullable<StakingProgramId> | undefined =>
  service?.chain_configs?.[service.home_chain]?.chain_data?.user_params
    ?.staking_program_id;

/**
 * Whether the instance is staked, for what the UI shows: `false` where it
 * cannot stake, `true` where staking is not optional, and otherwise its own
 * stored program, not the subgraph's cached latest contract, which can outlive
 * an unstake. `undefined` while that program is unknown.
 */
export const isInStakingMode = (
  agentConfig: Pick<
    AgentConfig,
    'hasStaking' | 'stakingChains' | 'defaultStakingProgramId'
  >,
  chainId: EvmChainId,
  service: Parameters<typeof getServiceStakingProgramId>[0],
): boolean | undefined => {
  if (!isStakingAvailable(agentConfig, chainId)) return false;
  if (!isNoStakingProgram(agentConfig.defaultStakingProgramId)) return true;
  const stakingProgramId = getServiceStakingProgramId(service);
  if (isNil(stakingProgramId)) return undefined;
  return !isNoStakingProgram(stakingProgramId);
};

/**
 * Whether a contract has a free service slot; `null` while its details are
 * unknown.
 */
export const hasFreeServiceSlot = (
  details:
    | Partial<Pick<StakingContractDetails, 'serviceIds' | 'maxNumServices'>>
    | undefined
    | null,
): boolean | null =>
  isNil(details?.serviceIds) || isNil(details?.maxNumServices)
    ? null
    : details.serviceIds.length < details.maxNumServices;

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

/** The staking programs the user may select, in order; see "Program ordering" in docs/features/staking-and-rewards.md. */
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

/** What a service on a retired program can do, by its Safe type (a PolySafe only withdraws). */
export type RetiredSafeState =
  | 'withdrawalOnly'
  | 'canSwitch'
  | 'loading'
  | 'error';

/** What is known of a service's multisig. */
export type SafeType = 'loading' | 'error' | 'polySafe' | 'standard';

/** The retired-program state for a known Safe type, or one that is loading or unreadable. */
export const toRetiredSafeState = (safeType: SafeType): RetiredSafeState => {
  if (safeType === 'polySafe') return 'withdrawalOnly';
  if (safeType === 'standard') return 'canSwitch';
  return safeType;
};

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
  safeState,
  stakingDetails,
}: {
  safeState: RetiredSafeState;
  stakingDetails: RetiredProgramStakingDetails;
}): RetiredProgramStatus => {
  if (safeState === 'withdrawalOnly') return { kind: 'withdrawalOnly' };
  if (
    stakingDetails.state === 'loaded' &&
    stakingDetails.placement === 'inMinimumPeriod'
  ) {
    return { kind: 'cooldown', endsAt: stakingDetails.cooldownEndsAt };
  }
  if (safeState === 'error') return { kind: 'safeTypeUnknown' };
  if (safeState === 'loading') return { kind: 'safeTypeLoading' };
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

/** The cooldown's end, as the alert and the reasons show it; `endsAt` in seconds. */
export const formatCooldownEnd = (endsAt: number) =>
  `${formatToShortDateTime(endsAt * 1000)} (UTC)`;

/** The alert's copy for a status, as a start-gate or Auto-run reason; `null` while loading. */
export const getRetiredProgramReason = (
  status: RetiredProgramStatus,
): string | null => {
  switch (status.kind) {
    case 'withdrawalOnly':
      return RETIRED_STAKING_PROGRAM_COPY.WITHDRAWAL_ONLY;
    case 'cooldown':
      return `${RETIRED_STAKING_PROGRAM_COPY.COOLDOWN_PREFIX} ${formatCooldownEnd(status.endsAt)}${RETIRED_STAKING_PROGRAM_COPY.COOLDOWN_SUFFIX}`;
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
