import { Address } from './Address';

enum StakingProgramStatus {
  Active = 'current',
  Default = 'default',
}

export type StakingProgram = {
  name: string;
  rewardsPerWorkPeriod: number;
  requiredOlasForStaking: number;
  isEnoughSlots?: boolean;
  status: StakingProgramStatus;
  contractAddress: Address;
};
