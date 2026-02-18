import { z } from 'zod';

const zodBigNumber = z.object({
  _isBigNumber: z.boolean(),
  _hex: z.string().startsWith('0x'),
});

export const StakingRewardsInfoSchema = z.object({
  // mechRequestCount: z.number(),
  serviceInfo: z.array(z.unknown()),
  /* checkpoint period (in seconds). eg. 86400 */
  livenessPeriod: zodBigNumber,
  livenessRatio: zodBigNumber,
  /* rewards per second */
  rewardsPerSecond: zodBigNumber,
  isEligibleForRewards: z.boolean(),
  availableRewardsForEpoch: z.number(),
  /* current epoch rewards */
  accruedServiceStakingRewards: z.number(),
  minimumStakedAmount: z.number(),
  tsCheckpoint: zodBigNumber.transform((val) => parseInt(val._hex, 16)),
});

export type StakingRewardsInfo = z.infer<typeof StakingRewardsInfoSchema>;

export enum StakingState {
  NotStaked = 0,
  Staked = 1,
  Evicted = 2,
}

export type StakingContractDetails = {
  availableRewards: number;
  /* number of slots available for staking */
  maxNumServices: number;
  serviceIds: number[];
  /** minimum staking duration (in seconds) */
  minimumStakingDuration: number;
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
  /** epoch length in seconds */
  livenessPeriod: number;
};

export type ServiceStakingDetails = {
  /** time when service was 'last' staked (in seconds) - (0 = never staked) */
  serviceStakingStartTime: number;
  /** 0: not staked, 1: staked, 2: evicted */
  serviceStakingState: StakingState;
};
