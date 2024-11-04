import { StakingProgramId } from '@/enums/StakingProgram';

export type StakingProgramMeta = {
  name: string;
  canMigrateTo: StakingProgramId[];
  deprecated: boolean;
};

const allStakingProgramIds = Object.values(StakingProgramId);
const deprecatedStakingProgramIds = [StakingProgramId.Alpha];
const activeStakingProgramIds = allStakingProgramIds.filter(
  (id) => !deprecatedStakingProgramIds.includes(id),
);

const activeStakingProgramsWithout = (stakingProgramId: StakingProgramId) =>
  activeStakingProgramIds.filter((id) => id !== stakingProgramId);

export const STAKING_PROGRAM_META: Record<
  StakingProgramId,
  StakingProgramMeta
> = {
  [StakingProgramId.Alpha]: {
    name: 'Pearl Alpha',
    canMigrateTo: activeStakingProgramsWithout(StakingProgramId.Alpha),
    deprecated: true,
  },
  [StakingProgramId.Beta]: {
    name: 'Pearl Beta',
    canMigrateTo: activeStakingProgramsWithout(StakingProgramId.Beta),
    deprecated: false,
  },
  [StakingProgramId.Beta2]: {
    name: 'Pearl Beta 2',
    canMigrateTo: activeStakingProgramsWithout(StakingProgramId.Beta2),
    deprecated: false,
  },
  [StakingProgramId.Beta3]: {
    name: 'Pearl Beta 3',
    canMigrateTo: activeStakingProgramsWithout(StakingProgramId.Beta3),
    deprecated: false,
  },
  [StakingProgramId.Beta4]: {
    name: 'Pearl Beta 4',
    canMigrateTo: activeStakingProgramsWithout(StakingProgramId.Beta4),
    deprecated: false,
  },
  [StakingProgramId.Beta5]: {
    name: 'Pearl Beta 5',
    canMigrateTo: activeStakingProgramsWithout(StakingProgramId.Beta5),
    deprecated: false,
  },

  [StakingProgramId.BetaMechMarketplace]: {
    name: 'Pearl Beta Mech Marketplace',
    canMigrateTo: activeStakingProgramsWithout(
      StakingProgramId.BetaMechMarketplace,
    ),
    deprecated: false,
  },
};
