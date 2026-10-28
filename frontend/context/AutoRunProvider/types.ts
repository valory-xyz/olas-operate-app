import { AGENT_CONFIG } from '@/config/agents';
import { AgentType, EvmChainId, StakingProgramId } from '@/constants';
import {
  ActivityGoal,
  Address,
  Service,
  ServiceConfigId,
  StakingRewardsInfo,
} from '@/types';

/**
 * Legacy auto-run inclusion entry, keyed by AgentType.
 * @deprecated Use `IncludedAgentInstance` instead. Kept for one-time migration
 */
export type IncludedAgent = {
  agentType: AgentType;
  order: number;
};

/**
 * Auto-run inclusion entry, keyed by serviceConfigId.
 * Each entry represents a single service instance in the rotation queue,
 * with `order` determining the rotation sequence.
 */
export type IncludedAgentInstance = {
  serviceConfigId: string;
  order: number;
};

type Eligibility = {
  canRun: boolean;
  reason?: string;
  loadingReason?: string;
};

export type AutoRunContextType = {
  /** Whether Auto-Run is enabled or not. */
  enabled: boolean;
  /** List of instances included in the Auto-Run set, with their order. */
  includedInstances: IncludedAgentInstance[];
  /** List of instances excluded from the Auto-Run set. */
  excludedInstances: string[];
  /**
   * Instances whose agent config opts out of auto-run entirely
   * (`isExcludedFromAutoRun`). Shown as permanently blocked rows in the
   * auto-run options, never includable.
   */
  configExcludedInstances: string[];
  /** Whether the Auto-Run toggle is in the process of being changed. */
  isToggling: boolean;
  /**
   * Eligibility information for each instance, keyed by serviceConfigId.
   * @example
   *  {
   *    "sc-aa001122-bb33-cc44-dd55-eeff66778899": {
   *      canRun: false,
   *      reason: "Insufficient funds",
   *    },
   *    "sc-11223344-5566-7788-99aa-bbccddeeff00": {
   *      canRun: true,
   *    },
   *  }
   */
  eligibilityByInstance: Partial<Record<string, Eligibility>>;
  setEnabled: (enabled: boolean) => void;
  includeInstance: (serviceConfigId: string) => void;
  excludeInstance: (serviceConfigId: string) => void;
};

/**
 * Metadata about an agent
 */
export type AgentMeta = {
  agentType: AgentType;
  agentConfig: (typeof AGENT_CONFIG)[AgentType];
  service: Service;
  serviceConfigId: ServiceConfigId;
  chainId: EvmChainId;
  stakingProgramId: StakingProgramId;
  multisig?: Address;
  serviceNftTokenId?: number;
};

/**
 * The last rewards read of an instance. Kept, never wiped: whether it can
 * still decide a start is checked when it is used (`getUsableRewardStatus`).
 */
export type RewardSnapshot = {
  /** Done for the epoch/run, or a stalled turn when `stalled` is true. */
  done: boolean;
  /** This turn ended for lack of progress, rather than completed epoch work. */
  stalled?: boolean;
  /** When the read completed, in ms. */
  readAt: number;
  stakingProgramId: StakingProgramId;
  /** Epoch start of the read, in seconds. */
  tsCheckpoint: number;
  livenessPeriod: StakingRewardsInfo['livenessPeriod'];
  /** `activity_goal` read with it, `null` when none was read. */
  goalUnit: ActivityGoal['unit'] | null;
  goalTarget: number | null;
  goalPeriodStart: number | null;
};

/** An instance's activity goal as last seen outside a rewards read. */
export type ObservedGoal = {
  goal: ActivityGoal | null;
  /** ms */
  observedAt: number;
};

/**
 * When the running instance's activity goal last moved: started once its
 * staking KPI is met, restarted on any change of the values below.
 */
export type StallClock = {
  /** ms */
  since: number;
  progress: number;
  target: number;
  periodStart: number;
};
