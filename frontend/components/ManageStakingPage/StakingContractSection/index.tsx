import { Flex, Tag, theme, Typography } from 'antd';
import { useMemo } from 'react';

import { CardSection } from '@/components/styled/CardSection';
import { GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES } from '@/config/stakingPrograms/gnosis';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { EXPLORER_URL_BY_EVM_CHAIN_ID } from '@/constants/urls';
import { StakingProgramId } from '@/enums/StakingProgram';
import { StakingProgramStatus } from '@/enums/StakingProgramStatus';
import { useServices } from '@/hooks/useServices';
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
    defaultStakingProgramId,
    activeStakingProgramId,
    selectedStakingProgramId,
    allStakingProgramsMeta,
    isActiveStakingProgramLoaded,
  } = useStakingProgram();
  const { selectedAgentConfig } = useServices();

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
    if (!isActiveStakingProgramLoaded) return null;

    if (activeStakingProgramId === stakingProgramId) {
      return StakingProgramStatus.Active;
    }

    // Pearl is not staked, set as Selected if default
    if (
      !activeStakingProgramId &&
      stakingProgramId === defaultStakingProgramId
    ) {
      return StakingProgramStatus.Default;
    }

    // Otherwise, no tag
    return null;
  }, [
    activeStakingProgramId,
    defaultStakingProgramId,
    isActiveStakingProgramLoaded,
    stakingProgramId,
  ]);

  const showMigrateButton =
    isActiveStakingProgramLoaded &&
    stakingProgramId !== selectedStakingProgramId;

  const showFundingButton = useMemo(() => {
    if (!isActiveStakingProgramLoaded) return false;
    if (migrateValidation.canMigrate) return false;
    return (
      migrateValidation.reason ===
        CantMigrateReason.InsufficientOlasToMigrate ||
      migrateValidation.reason === CantMigrateReason.InsufficientGasToMigrate
    );
  }, [isActiveStakingProgramLoaded, migrateValidation]);

  const evmChainId = selectedAgentConfig.evmHomeChainId;

  return (
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
          {allStakingProgramsMeta[stakingProgramId]?.name || 'Unknown'}
        </Title>
        <StakingContractTag status={contractTagStatus} />
      </Flex>

      <StakingContractDetails stakingProgramId={stakingProgramId} />

      {evmChainId && (
        <a
          href={`${EXPLORER_URL_BY_EVM_CHAIN_ID[evmChainId]}/address/${
            // TODO: make chain independent
            GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES[stakingProgramId]
          }`}
          target="_blank"
        >
          View contract details {UNICODE_SYMBOLS.EXTERNAL_LINK}
        </a>
      )}

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
  );
};
