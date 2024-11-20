import { Flex, Tag, theme, Typography } from 'antd';
import { useMemo } from 'react';

import { MiddlewareChain } from '@/client';
import { CardSection } from '@/components/styled/CardSection';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { EXPLORER_URL } from '@/constants/urls';
import { StakingProgramId } from '@/enums/StakingProgram';
import { StakingProgramStatus } from '@/enums/StakingProgramStatus';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { CantMigrateAlert } from './CantMigrateAlert';
import { MigrateButton } from './MigrateButton';
import { StakingContractDetails } from './StakingContractDetails';
import { StakingContractFundingButton } from './StakingContractFundingButton';
import { CantMigrateReason, useMigrate } from './useMigrate';

const { Title } = Typography;
const { useToken } = theme;

type StakingContractTagProps = { status: StakingProgramStatus | null };
export const StakingContractTag = ({ status }: StakingContractTagProps) => {
  if (status === StakingProgramStatus.Active) {
    return <Tag color="purple">Active</Tag>;
  }
  if (status === StakingProgramStatus.Default) {
    return <Tag color="purple">Default</Tag>;
  }
  return null;
};

type StakingContractSectionProps = { stakingProgramId: StakingProgramId };
export const StakingContractSection = ({
  stakingProgramId,
}: StakingContractSectionProps) => {
  const { token } = useToken();
  const { migrateValidation } = useMigrate(stakingProgramId);
  const {
    initialDefaultStakingProgramId,
    activeStakingProgramId,
    activeStakingProgramMeta,
    activeStakingProgramAddress,
  } = useStakingProgram();

  // /**
  //  * Returns `true` if this stakingProgram is active,
  //  * or user is unstaked and this is the default
  //  */
  // const isActiveStakingProgram = useMemo(() => {
  //   if (activeStakingProgramId === null)
  //     return defaultStakingProgramId === stakingProgramId;
  //   return activeStakingProgramId === stakingProgramId;
  // }, [activeStakingProgramId, defaultStakingProgramId, stakingProgramId]);

  const contractTagStatus = useMemo(() => {
    if (activeStakingProgramId === stakingProgramId) {
      return StakingProgramStatus.Active;
    }

    // Pearl is not staked, set as Selected if default
    if (
      !activeStakingProgramId &&
      stakingProgramId === initialDefaultStakingProgramId
    ) {
      return StakingProgramStatus.Default;
    }

    // Otherwise, no tag
    return null;
  }, [
    activeStakingProgramId,
    initialDefaultStakingProgramId,
    stakingProgramId,
  ]);

  const showMigrateButton = stakingProgramId !== activeStakingProgramId;

  const showFundingButton = useMemo(() => {
    if (migrateValidation.canMigrate) return false;
    return (
      migrateValidation.reason ===
        CantMigrateReason.InsufficientOlasToMigrate ||
      migrateValidation.reason === CantMigrateReason.InsufficientGasToMigrate
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
            {`${activeStakingProgramMeta?.name} contract`}
          </Title>
          <StakingContractTag status={contractTagStatus} />
        </Flex>

        <StakingContractDetails stakingProgramId={stakingProgramId} />
        <a
          href={`${EXPLORER_URL[]}/address/${activeStakingProgramAddress}`}
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
