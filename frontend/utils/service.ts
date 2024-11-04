import { ServiceTemplate } from '@/client';
import { DEFAULT_STAKING_PROGRAM_ID } from '@/context/StakingProgramProvider';
import { StakingProgramId } from '@/enums/StakingProgram';

/** TODO: update from hardcoded, workaround for quick release */
export const getMinimumStakedAmountRequired = (
  serviceTemplate?: ServiceTemplate, //TODO: remove, as unused
  stakingProgramId: StakingProgramId = DEFAULT_STAKING_PROGRAM_ID,
): number | undefined => {
  if (stakingProgramId === StakingProgramId.Alpha) {
    return 20;
  }

  if (stakingProgramId === StakingProgramId.Beta) {
    return 40;
  }

  if (stakingProgramId === StakingProgramId.Beta2) {
    return 100;
  }

  if (stakingProgramId === StakingProgramId.Beta3) {
    return 100;
  }

  if (stakingProgramId === StakingProgramId.Beta4) {
    return 100;
  }

  if (stakingProgramId === StakingProgramId.Beta5) {
    return 10;
  }

  if (stakingProgramId === StakingProgramId.BetaMechMarketplace) {
    return 40;
  }

  return;
};
