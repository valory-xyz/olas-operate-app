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
  /* number of slots available for staking */
  maxNumServices: number;
  serviceIds: number[];
  /** minimum staking duration (in seconds) */
  minimumStakingDuration: number;
  /** time when service was staked (in seconds) - 0 = never staked */
  serviceStakingStartTime: number;
  /** time when service can be unstaked (in seconds) - has to meet minimum staking duration */
  remainingStakingDuration: number;
  /** 0: not staked, 1: staked, 2: unstaked - current state of the service */
  serviceStakingState: number;
  /** OLAS cost of staking */
  minStakingDeposit: number;
  /** estimated annual percentage yield */
  apy: number;
  /** amount of OLAS required to stake */
  olasStakeRequired: number;
  /** rewards per work period */
  rewardsPerWorkPeriod: number;
  /** current epoch */
  epochCounter: number;
};
