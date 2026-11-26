import { isNil } from 'lodash';

import type {
  StakingProgramConfig,
  StakingProgramMap,
} from '@/config/stakingPrograms';
import type { AgentType, EvmChainId, StakingProgramId } from '@/constants';
import {
  Address,
  AgentConfig,
  MiddlewareServiceResponse,
  Nullable,
} from '@/types';

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
) => stakingProgramId === 'no_staking';

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
export const isServiceStaked = (
  agentConfig: Pick<
    AgentConfig,
    'hasStaking' | 'stakingChains' | 'defaultStakingProgramId'
  >,
  chainId: EvmChainId,
  service: Parameters<typeof getServiceStakingProgramId>[0],
): boolean | undefined => {
  if (!isStakingAvailable(agentConfig, chainId)) return false;
  if (!hasUnstakedOption(agentConfig, chainId)) return true;
  const stakingProgramId = getServiceStakingProgramId(service);
  if (isNil(stakingProgramId)) return undefined;
  return !isNoStakingProgram(stakingProgramId);
};

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
 * 1. The current program first — even if deprecated or incompatible, the user
 *    must be able to see the contract they are actually staked in.
 * 2. Deprecated programs are hidden.
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
    if (program.deprecated) return acc;
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
