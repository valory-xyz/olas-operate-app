import { Button, Flex, Popover, theme, Typography } from 'antd';
import { useMemo } from 'react';

import { DeploymentStatus } from '@/client';
import { CardSection } from '@/components/styled/CardSection';
import { STAKING_PROGRAM_META } from '@/constants/stakingProgramMeta';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { Pages } from '@/enums/PageState';
import { StakingProgram } from '@/enums/StakingProgram';
import { StakingProgramStatus } from '@/enums/StakingProgramStatus';
import { useBalance } from '@/hooks/useBalance';
import { useModals } from '@/hooks/useModals';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { useServiceTemplates } from '@/hooks/useServiceTemplates';
import { useStakingContractInfo } from '@/hooks/useStakingContractInfo';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { ServicesService } from '@/service/Services';
import { Address } from '@/types/Address';
import { getMinimumStakedAmountRequired } from '@/utils/service';

import {
  AlertInsufficientMigrationFunds,
  AlertNoSlots,
  AlertUpdateToMigrate,
} from './alerts';
import { StakingContractTag } from './StakingContractTag';

// const { Text } = Typography;

const { useToken } = theme;

// const CustomDivider = styled(Divider)`
//   flex: auto;
//   width: max-content;
//   min-width: 0;
//   margin: 0;
// `;

// const ContractParameter = ({
//   label,
//   value,
// }: {
//   label: string;
//   value: string;
// }) => (
//   <Flex gap={16} align="center">
//     <Text type="secondary">{label}</Text>
//     <CustomDivider />
//     <Text className="font-weight-600">{value}</Text>
//   </Flex>
// );

export const StakingContractSection = ({
  stakingProgram,
  contractAddress,
}: {
  stakingProgram: StakingProgram;
  contractAddress: Address;
}) => {
  const { goto } = usePageState();
  const { setServiceStatus, serviceStatus, setIsServicePollingPaused } =
    useServices();
  const { serviceTemplate } = useServiceTemplates();
  const { setMigrationModalOpen } = useModals();
  const {
    activeStakingProgram,
    defaultStakingProgram,
    updateActiveStakingProgram: updateStakingProgram,
  } = useStakingProgram();
  const { stakingContractInfoRecord } = useStakingContractInfo();
  const { token } = useToken();
  const { totalOlasBalance, isBalanceLoaded } = useBalance();
  const { isServiceStakedForMinimumDuration } = useStakingContractInfo();

  const stakingContractInfoForStakingProgram =
    stakingContractInfoRecord?.[stakingProgram];

  const activeStakingProgramMeta = STAKING_PROGRAM_META[stakingProgram];

  const isSelected =
    activeStakingProgram && activeStakingProgram === stakingProgram;

  const hasEnoughRewards = true;
  //(stakingContractInfoForStakingProgram?.availableRewards ?? 0) > 0;

  const minimumOlasRequiredToMigrate = useMemo(
    () => getMinimumStakedAmountRequired(serviceTemplate, StakingProgram.Beta),
    [serviceTemplate],
  );

  const hasEnoughOlasToMigrate = useMemo(() => {
    if (totalOlasBalance === undefined) return false;
    if (!minimumOlasRequiredToMigrate) return false;
    return totalOlasBalance >= minimumOlasRequiredToMigrate;
  }, [minimumOlasRequiredToMigrate, totalOlasBalance]);

  const hasEnoughSlots =
    stakingContractInfoForStakingProgram?.maxNumServices &&
    stakingContractInfoForStakingProgram?.serviceIds &&
    stakingContractInfoForStakingProgram?.maxNumServices >
      stakingContractInfoForStakingProgram?.serviceIds?.length;

  // TODO: compatibility needs to be implemented
  const isAppVersionCompatible = true; // contract.appVersion === 'rc105';

  const isMigratable =
    !isSelected &&
    activeStakingProgram === StakingProgram.Alpha && // TODO: make more elegant
    isBalanceLoaded &&
    hasEnoughSlots &&
    hasEnoughRewards &&
    hasEnoughOlasToMigrate &&
    isAppVersionCompatible &&
    serviceStatus !== DeploymentStatus.DEPLOYED &&
    serviceStatus !== DeploymentStatus.DEPLOYING &&
    serviceStatus !== DeploymentStatus.STOPPING &&
    isServiceStakedForMinimumDuration;

  const cantMigrateReason = useMemo(() => {
    if (isSelected) {
      return 'Contract is already selected';
    }

    if (!hasEnoughRewards) {
      return 'No available rewards';
    }

    if (activeStakingProgram !== StakingProgram.Alpha) {
      return 'Can only migrate from Alpha to Beta';
    }

    if (!isBalanceLoaded) {
      return 'Loading balance...';
    }

    if (!hasEnoughSlots) {
      return 'No available staking slots';
    }

    if (!hasEnoughOlasToMigrate) {
      return `Insufficient OLAS to migrate, ${minimumOlasRequiredToMigrate} OLAS required in total.`;
    }

    if (!isAppVersionCompatible) {
      return 'Pearl update required to migrate';
    }

    if (serviceStatus === DeploymentStatus.DEPLOYED) {
      return 'Service is currently running';
    }

    if (serviceStatus === DeploymentStatus.DEPLOYING) {
      return 'Service is currently deploying';
    }

    if (serviceStatus === DeploymentStatus.STOPPING) {
      return 'Service is currently stopping';
    }

    if (!isServiceStakedForMinimumDuration) {
      return 'Service has not been staked for the minimum duration';
    }
  }, [
    activeStakingProgram,
    hasEnoughOlasToMigrate,
    hasEnoughRewards,
    hasEnoughSlots,
    isAppVersionCompatible,
    isBalanceLoaded,
    isSelected,
    isServiceStakedForMinimumDuration,
    serviceStatus,
  ]);

  const cantMigrateAlert = useMemo(() => {
    if (isSelected || !isBalanceLoaded) {
      return null;
    }

    if (!hasEnoughSlots) {
      return <AlertNoSlots />;
    }

    if (!hasEnoughOlasToMigrate) {
      return (
        <AlertInsufficientMigrationFunds totalOlasBalance={totalOlasBalance!} />
      );
    }

    if (!isAppVersionCompatible) {
      return <AlertUpdateToMigrate />;
    }
  }, [
    isSelected,
    isBalanceLoaded,
    totalOlasBalance,
    hasEnoughSlots,
    hasEnoughOlasToMigrate,
    isAppVersionCompatible,
  ]);

  const contractTagStatus = useMemo(() => {
    if (activeStakingProgram === stakingProgram)
      return StakingProgramStatus.Selected;

    // Pearl is not staked, set as Selected if default (Beta)
    if (!activeStakingProgram && stakingProgram === defaultStakingProgram)
      return StakingProgramStatus.Selected;

    // Otherwise, highlight Beta as New
    if (stakingProgram === StakingProgram.Beta) return StakingProgramStatus.New;

    // Otherwise, no tag
    return;
  }, [activeStakingProgram, defaultStakingProgram, stakingProgram]);

  return (
    <CardSection
      style={
        isSelected || !activeStakingProgram
          ? { background: token.colorBgContainerDisabled }
          : {}
      }
      borderbottom="true"
      vertical
      gap={16}
    >
      {/* Title */}
      <Flex gap={12}>
        <Typography.Title
          level={5}
          className="m-0"
        >{`${activeStakingProgramMeta.name} contract`}</Typography.Title>
        {/* TODO: pass `status` attribute */}
        <StakingContractTag status={contractTagStatus} />
        {!isSelected && (
          // here instead of isSelected we should check that the contract is not the old staking contract
          // but the one from staking factory (if we want to open govern)
          <a
            href={`https://gnosisscan.io/address/${contractAddress}`}
            target="_blank"
            className="ml-auto"
          >
            Contract details {UNICODE_SYMBOLS.EXTERNAL_LINK}
          </a>
        )}
      </Flex>

      {/* TODO: fix */}

      {/* Contract details
      {stakingContractInfo?.availableRewards && (
        <ContractParameter
          label="Rewards per work period"
          value={`${stakingContractInfo?.availableRewards} OLAS`}
        />
      )}

      {stakingContractInfo?.minStakingDeposit && (
        <ContractParameter
          label="Required OLAS for staking"
          value={`${stakingContractInfo?.minStakingDeposit} OLAS`}
        />
      )} */}

      {cantMigrateAlert}
      {/* Switch to program button */}
      {!isSelected && (
        <Popover content={!isMigratable && cantMigrateReason}>
          <Button
            type="primary"
            size="large"
            disabled={!isMigratable}
            onClick={async () => {
              setIsServicePollingPaused(true);
              try {
                setServiceStatus(DeploymentStatus.DEPLOYING);
                goto(Pages.Main);
                // TODO: cleanup and call via hook

                await ServicesService.createService({
                  stakingProgram,
                  serviceTemplate,
                  deploy: true,
                }).then(() => {
                  updateStakingProgram().then(() =>
                    setMigrationModalOpen(true),
                  );
                });
              } catch (error) {
                console.error(error);
              } finally {
                setIsServicePollingPaused(false);
              }
            }}
          >
            Switch to {activeStakingProgramMeta?.name} contract
          </Button>
        </Popover>
      )}
    </CardSection>
  );
};
