import { ServiceTemplate } from '@/client';
import { SERVICE_STAKING_CONTRACT_ADDRESSES } from '@/constants/contractAddresses';
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

/**
 *
 * Get the staking program id by address
 * @example getStakingProgramIdByAddress('0x3052451e1eAee78e62E169AfdF6288F8791F2918') // StakingProgramId.Beta4
 */
export const getStakingProgramIdByAddress = (
  contractAddress: `0x${string}`,
): StakingProgramId | undefined => {
  const entries = Object.entries(SERVICE_STAKING_CONTRACT_ADDRESSES) as [
    StakingProgramId,
    `0x${string}`,
  ][];
  const foundEntry = entries.find(
    ([, address]) => address.toLowerCase() === contractAddress.toLowerCase(),
  );
  return foundEntry ? foundEntry[0] : undefined;
};
