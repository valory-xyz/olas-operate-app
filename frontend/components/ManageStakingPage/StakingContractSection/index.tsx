import { Button, Flex, Popover, theme, Typography } from 'antd';
import { useMemo, useState } from 'react';

import { Chain, DeploymentStatus } from '@/client';
import { OpenAddFundsSection } from '@/components/MainPage/sections/AddFundsSection';
import { CardSection } from '@/components/styled/CardSection';
import { SERVICE_STAKING_TOKEN_MECH_USAGE_CONTRACT_ADDRESSES } from '@/constants/contractAddresses';
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
import { getMinimumStakedAmountRequired } from '@/utils/service';

import { AlertInsufficientMigrationFunds, AlertNoSlots } from './alerts';
import { StakingContractDetails } from './StakingContractDetails';
import { StakingContractTag } from './StakingContractTag';

const { Title } = Typography;
const { useToken } = theme;

type StakingProgramProps = { stakingProgram: StakingProgram };
export const StakingContractSection = ({
  stakingProgram,
}: StakingProgramProps) => {
  const { goto } = usePageState();
  const {
    setServiceStatus,
    serviceStatus,
    setIsServicePollingPaused,
    updateServiceStatus,
  } = useServices();
  const { serviceTemplate } = useServiceTemplates();
  const { setMigrationModalOpen } = useModals();
  const { activeStakingProgram, defaultStakingProgram, updateStakingProgram } =
    useStakingProgram();
  const { token } = useToken();
  const {
    safeBalance,
    totalOlasStakedBalance,
    isBalanceLoaded,
    setIsPaused: setIsBalancePollingPaused,
  } = useBalance();
  const { isServiceStakedForMinimumDuration, stakingContractInfoRecord } =
    useStakingContractInfo();
  const [isFundingSectionOpen, setIsFundingSectionOpen] = useState(false);

  const stakingContractAddress =
    SERVICE_STAKING_TOKEN_MECH_USAGE_CONTRACT_ADDRESSES[Chain.GNOSIS][
      stakingProgram
    ];

  const stakingProgramMeta = STAKING_PROGRAM_META[stakingProgram];

  const stakingContractInfoForStakingProgram =
    stakingContractInfoRecord?.[stakingProgram];

  const activeStakingProgramMeta =
    activeStakingProgram && STAKING_PROGRAM_META[activeStakingProgram];

  const isSelected =
    activeStakingProgram && activeStakingProgram === stakingProgram;

  const hasEnoughRewards = true;
  //(stakingContractInfoForStakingProgram?.availableRewards ?? 0) > 0;

  const minimumOlasRequiredToMigrate = useMemo(
    () => getMinimumStakedAmountRequired(serviceTemplate, stakingProgram),
    [serviceTemplate, stakingProgram],
  );

  // Check if there are enough OLAS to migrate
  const hasEnoughOlasToMigrate = useMemo(() => {
    if (safeBalance?.OLAS === undefined || totalOlasStakedBalance === undefined)
      return false;

    const balanceForMigration = safeBalance.OLAS + totalOlasStakedBalance;
    if (minimumOlasRequiredToMigrate === undefined) return false;

    return balanceForMigration >= minimumOlasRequiredToMigrate;
  }, [minimumOlasRequiredToMigrate, safeBalance?.OLAS, totalOlasStakedBalance]);

  // Check if there are enough SLOTS available
  const hasEnoughSlots = useMemo(() => {
    if (!stakingContractInfoForStakingProgram) return false;

    const { maxNumServices, serviceIds } = stakingContractInfoForStakingProgram;
    return maxNumServices && serviceIds && maxNumServices > serviceIds.length;
  }, [stakingContractInfoForStakingProgram]);

  const activeStakingContractSupportsMigration =
    !activeStakingProgram ||
    (activeStakingProgramMeta?.canMigrateTo.includes(stakingProgram) &&
      isServiceStakedForMinimumDuration);

  const canMigrate =
    // checks for both initial deployment and migration
    !isSelected &&
    isBalanceLoaded &&
    hasEnoughSlots &&
    hasEnoughRewards &&
    hasEnoughOlasToMigrate &&
    serviceStatus !== DeploymentStatus.DEPLOYED &&
    serviceStatus !== DeploymentStatus.DEPLOYING &&
    serviceStatus !== DeploymentStatus.STOPPING &&
    // checks for migration from an actively staked service
    (!activeStakingProgram ||
      (isServiceStakedForMinimumDuration &&
        activeStakingProgramMeta?.canMigrateTo.includes(stakingProgram)));

  const cantMigrateReason = useMemo(() => {
    if (isSelected) {
      return 'Contract is already selected';
    }

    if (!activeStakingProgramMeta?.canMigrateTo.includes(stakingProgram)) {
      return 'Migration not supported for this contract';
    }

    if (!hasEnoughRewards) {
      return 'No available rewards';
    }

    if (!isBalanceLoaded) {
      return 'Loading balance...';
    }

    if (!hasEnoughSlots) {
      return 'No available staking slots';
    }

    if (!isServiceStakedForMinimumDuration) {
      return 'Service has not been staked for the minimum duration';
    }

    if (!hasEnoughOlasToMigrate) {
      return `Insufficient OLAS to migrate, ${minimumOlasRequiredToMigrate} OLAS required in total.`;
    }

    // App version compatibility not implemented yet
    // if (!isAppVersionCompatible) {
    //   return 'Pearl update required to migrate';
    // }

    if (serviceStatus === DeploymentStatus.DEPLOYED) {
      return 'Pearl is currently running, turn it off before switching';
    }

    if (serviceStatus === DeploymentStatus.DEPLOYING) {
      return 'Pearl is currently deploying, please turn it off before switching';
    }

    if (serviceStatus === DeploymentStatus.STOPPING) {
      return 'Pearl is currently stopping, please wait before switching';
    }
  }, [
    activeStakingProgramMeta,
    hasEnoughOlasToMigrate,
    hasEnoughRewards,
    hasEnoughSlots,
    isBalanceLoaded,
    isSelected,
    isServiceStakedForMinimumDuration,
    minimumOlasRequiredToMigrate,
    serviceStatus,
    stakingProgram,
  ]);

  const cantMigrateAlert = useMemo(() => {
    if (isSelected || !isBalanceLoaded) {
      return null;
    }

    if (!hasEnoughSlots) {
      return <AlertNoSlots />;
    }

    if (
      !hasEnoughOlasToMigrate &&
      safeBalance?.OLAS !== undefined &&
      totalOlasStakedBalance !== undefined
    ) {
      return (
        <AlertInsufficientMigrationFunds
          masterSafeOlasBalance={safeBalance.OLAS}
          stakedOlasBalance={totalOlasStakedBalance}
          totalOlasRequiredForStaking={minimumOlasRequiredToMigrate!}
        />
      );
    }

    // App version compatibility not implemented yet
    // if (!isAppVersionCompatible) {
    //   return <AlertUpdateToMigrate />;
    // }
  }, [
    isSelected,
    isBalanceLoaded,
    hasEnoughSlots,
    hasEnoughOlasToMigrate,
    safeBalance?.OLAS,
    totalOlasStakedBalance,
    minimumOlasRequiredToMigrate,
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

  // Show funding address
  const canShowFundingAddress =
    !isSelected &&
    activeStakingContractSupportsMigration &&
    !hasEnoughOlasToMigrate;

  const cardStyle = useMemo(() => {
    if (isSelected || !activeStakingProgram) {
      return { background: token.colorPrimaryBg };
    }
    return {};
  }, [isSelected, activeStakingProgram, token.colorPrimaryBg]);

  return (
    <>
      <CardSection style={cardStyle} borderbottom="true" vertical gap={16}>
        <Flex gap={12}>
          <Title level={5} className="m-0">
            {`${stakingProgramMeta?.name} contract`}
          </Title>
          <StakingContractTag status={contractTagStatus} />
        </Flex>

        <StakingContractDetails name={stakingProgram} />
        <a
          href={`https://gnosisscan.io/address/${stakingContractAddress}`}
          target="_blank"
        >
          View contract details {UNICODE_SYMBOLS.EXTERNAL_LINK}
        </a>
        {activeStakingContractSupportsMigration && cantMigrateAlert}

        {/* Switch to program button */}
        {![activeStakingProgram, defaultStakingProgram].includes(
          stakingProgram,
        ) && (
          <Popover content={!canMigrate && cantMigrateReason}>
            <Button
              type="primary"
              size="large"
              disabled={!canMigrate}
              onClick={async () => {
                setIsServicePollingPaused(true);
                setIsBalancePollingPaused(true);

                try {
                  setServiceStatus(DeploymentStatus.DEPLOYING);
                  goto(Pages.Main);

                  await ServicesService.createService({
                    stakingProgram,
                    serviceTemplate,
                    deploy: true,
                  });

                  await updateStakingProgram();

                  setMigrationModalOpen(true);
                } catch (error) {
                  console.error(error);
                } finally {
                  setIsServicePollingPaused(false);
                  setIsBalancePollingPaused(false);
                  updateServiceStatus();
                }
              }}
            >
              Switch and run agent
            </Button>
          </Popover>
        )}

        {/* show funding address */}
        {canShowFundingAddress && (
          <>
            <Button
              type="default"
              size="large"
              onClick={() => setIsFundingSectionOpen((prev) => !prev)}
            >
              {isFundingSectionOpen ? 'Hide' : 'Show'} address to fund
            </Button>
            {isFundingSectionOpen && <OpenAddFundsSection />}
          </>
        )}
      </CardSection>
    </>
  );
};
