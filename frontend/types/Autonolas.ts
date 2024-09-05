export type StakingRewardsInfo = {
  mechRequestCount: number;
  serviceInfo: unknown[];
  livenessPeriod: number;
  livenessRatio: number;
  rewardsPerSecond: number;
  isEligibleForRewards: boolean;
  availableRewardsForEpoch: number;
  accruedServiceStakingRewards: number;
  minimumStakedAmount: number;
};

export type StakingContractInfo = {
  availableRewards: number;
  maxNumServices: number;
  serviceIds: number[];
  /** minimum staking duration (in seconds) */
  minimumStakingDuration: number;
  /** time when service was staked (in seconds) */
  serviceStakingStartTime: number;
  /** 0: not staked, 1: staked, 2: unstaked - current state of the service */
  serviceStakingState: number;
  /** OLAS cost of staking */
  minStakingDeposit: number;
  /** annual percentage yield */
};

export type OtherStakingContractInfo = {
  apy?: number;
  /** amount of OLAS required to stake */
  stakeRequired?: number;
  /** rewards per work period */
  rewardsPerWorkPeriod?: number;
};

export type StakingContractDetails = Partial<StakingContractInfo> &
  OtherStakingContractInfo;
