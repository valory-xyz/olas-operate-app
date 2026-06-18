import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { EvmChainId, StakingProgramId } from '@/constants';
import { Address, Nullable } from '@/types';
import { AgentConfig } from '@/types/Agent';
import {
  StakingRewardsInfo,
  StakingRewardsInfoSchema,
} from '@/types/Autonolas';

type FetchAgentStakingRewardsInfoParams = {
  chainId: EvmChainId;
  stakingProgramId: Nullable<StakingProgramId>;
  multisig: string;
  serviceNftTokenId: number;
  agentConfig: AgentConfig;
};

/**
 * Shared staking rewards fetcher used by React Query hooks and auto-run runtime.
 * Throws on RPC or validation errors so React Query retains previousData instead
 * of overwriting it with null on transient failures.
 */
export const fetchAgentStakingRewardsInfo = async ({
  chainId,
  stakingProgramId,
  multisig,
  serviceNftTokenId,
  agentConfig,
}: FetchAgentStakingRewardsInfoParams): Promise<StakingRewardsInfo | null> => {
  if (!stakingProgramId) return null;

  const response = await agentConfig.serviceApi.getAgentStakingRewardsInfo({
    agentMultisigAddress: multisig as Address,
    serviceId: serviceNftTokenId,
    stakingProgramId,
    chainId,
  });

  if (!response) return null;
  return StakingRewardsInfoSchema.parse(response);
};

/**
 * The off-chain per-epoch activity target for a staking program, or `undefined`
 * if the program runs the legacy (on-chain KPI) regime. Presence of the target
 * marks the decoupled-activity regime (OPE-1803).
 */
export const getStakingProgramActivityTarget = (
  chainId: EvmChainId,
  stakingProgramId: Nullable<StakingProgramId>,
): number | undefined => {
  if (!stakingProgramId) return undefined;
  return STAKING_PROGRAMS[chainId]?.[stakingProgramId]?.activityTarget;
};

/**
 * Whether the agent has completed its epoch work — the single signal the reward
 * UI (banner, streak flame, sidebar dot, notification) and auto-run rotation key
 * off. Regime-aware:
 * - decoupled (`activityTarget` set): on-chain activity reached the off-chain target;
 * - legacy (`activityTarget` undefined): the on-chain staking KPI (`isEligibleForRewards`).
 *
 * In the legacy regime the two are identical, so existing behaviour is preserved.
 */
export const deriveIsEpochTargetMet = (
  stakingRewardsInfo: Pick<
    StakingRewardsInfo,
    'isEligibleForRewards' | 'activityThisEpoch'
  >,
  activityTarget: number | undefined,
): boolean => {
  if (activityTarget === undefined) {
    return stakingRewardsInfo.isEligibleForRewards;
  }
  return stakingRewardsInfo.activityThisEpoch >= activityTarget;
};
