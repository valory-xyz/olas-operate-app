import { StakingProgramId } from '@/enums/StakingProgram';

export type StakingProgramMeta = {
  name: string;
  canMigrateTo: StakingProgramId[];
  deprecated: boolean;
};

export const STAKING_PROGRAM_META: Record<
  StakingProgramId,
  StakingProgramMeta
> = {
  [StakingProgramId.Alpha]: {
    name: 'Pearl Alpha',
    canMigrateTo: [StakingProgramId.Beta, StakingProgramId.Beta2],
    deprecated: true,
  },
  [StakingProgramId.Beta]: {
    name: 'Pearl Beta',
    canMigrateTo: [StakingProgramId.Beta2],
    deprecated: false,
  },
  [StakingProgramId.Beta2]: {
    name: 'Pearl Beta 2',
    canMigrateTo: [StakingProgramId.Beta],
    deprecated: false,
  },
  [StakingProgramId.OptimusAlpha]: {
    name: 'Optimus Alpha',
    canMigrateTo: [],
    deprecated: false,
  },
};
