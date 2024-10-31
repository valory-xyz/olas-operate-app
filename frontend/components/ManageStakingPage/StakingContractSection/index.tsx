import { Flex, theme, Typography } from 'antd';
import { useMemo } from 'react';

import { MiddlewareChain } from '@/client';
import { CardSection } from '@/components/styled/CardSection';
import { SERVICE_STAKING_TOKEN_MECH_USAGE_CONTRACT_ADDRESSES } from '@/constants/contractAddresses';
import { STAKING_PROGRAM_META } from '@/constants/stakingProgramMeta';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { EXPLORER_URL } from '@/constants/urls';
import { DEFAULT_STAKING_PROGRAM_ID } from '@/context/StakingProgramProvider';
import { StakingProgramId } from '@/enums/StakingProgram';
import { StakingProgramStatus } from '@/enums/StakingProgramStatus';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { CantMigrateAlert } from './CantMigrateAlert';
import { MigrateButton } from './MigrateButton';
import { StakingContractDetails } from './StakingContractDetails';
import { StakingContractFundingButton } from './StakingContractFundingButton';
import { StakingContractTag } from './StakingContractTag';
import { CantMigrateReason, useMigrate } from './useMigrate';

const { Title } = Typography;
const { useToken } = theme;

type StakingContractSectionProps = { stakingProgramId: StakingProgramId };
export const StakingContractSection = ({
  stakingProgramId,
}: StakingContractSectionProps) => {
  const { activeStakingProgramId } = useStakingProgram();

  const { token } = useToken();

  const { migrateValidation } = useMigrate(stakingProgramId);

  const stakingContractAddress =
    SERVICE_STAKING_TOKEN_MECH_USAGE_CONTRACT_ADDRESSES[
      MiddlewareChain.OPTIMISM
    ][stakingProgramId];

  const stakingProgramMeta = STAKING_PROGRAM_META[stakingProgramId];

  /**
   * Returns `true` if this stakingProgram is active,
   * or user is unstaked and this is the default
   */
  const isActiveStakingProgram = useMemo(() => {
    if (activeStakingProgramId === null)
      return DEFAULT_STAKING_PROGRAM_ID === stakingProgramId;
    return activeStakingProgramId === stakingProgramId;
  }, [activeStakingProgramId, stakingProgramId]);

  const contractTagStatus = useMemo(() => {
    if (activeStakingProgramId === stakingProgramId)
      return StakingProgramStatus.Selected;

    // Pearl is not staked, set as Selected if default
    if (
      !activeStakingProgramId &&
      stakingProgramId === DEFAULT_STAKING_PROGRAM_ID
    )
      return StakingProgramStatus.Selected;

    // Otherwise, no tag
    return null;
  }, [activeStakingProgramId, stakingProgramId]);

  const showMigrateButton = !isActiveStakingProgram;
  const showFundingButton = useMemo(() => {
    if (migrateValidation.canMigrate) return false;
    return (
      migrateValidation.reason === CantMigrateReason.InsufficientOlasToMigrate
    );
  }, [migrateValidation]);

  return (
    <>
      <CardSection
        style={{
          padding: '16px 24px',
          backgroundColor: contractTagStatus ? token.colorPrimaryBg : undefined,
        }}
        borderbottom="true"
        vertical
        gap={16}
      >
        <Flex gap={12}>
          <Title level={5} className="m-0">
            {`${stakingProgramMeta?.name} contract`}
          </Title>
          <StakingContractTag status={contractTagStatus} />
        </Flex>

        <StakingContractDetails stakingProgramId={stakingProgramId} />
        <a
          href={`${EXPLORER_URL[MiddlewareChain.OPTIMISM]}/address/${stakingContractAddress}`}
          target="_blank"
        >
          View contract details {UNICODE_SYMBOLS.EXTERNAL_LINK}
        </a>

        {!migrateValidation.canMigrate && (
          <CantMigrateAlert
            stakingProgramId={stakingProgramId}
            cantMigrateReason={migrateValidation.reason}
          />
        )}

        {showMigrateButton && (
          <MigrateButton stakingProgramId={stakingProgramId} />
        )}
        {showFundingButton && <StakingContractFundingButton />}
      </CardSection>
    </>
  );
};
