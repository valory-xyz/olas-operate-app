import { Button, Flex, Statistic, Typography } from 'antd';
import { ReactNode } from 'react';
import { TbLock, TbSparkles, TbSquareRoundedPercentage } from 'react-icons/tb';
import styled from 'styled-components';

import { CardFlex, Divider, InfoTooltip, Tooltip } from '@/components/ui';
import { COLOR, NA, PAGES } from '@/constants';
import {
  usePageState,
  useStakingContractDetails,
  useStakingDetails,
  useStakingProgram,
} from '@/hooks';
import { secondsToHours } from '@/utils';

const { Title, Text } = Typography;
const { Timer } = Statistic;

const IconWrapper = styled(Flex)`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  border: 1px solid ${COLOR.PURPLE_LIGHT_4};
  background-color: ${COLOR.WHITE};
  transition: background-color 0.2s ease-in-out;
  background: url('/empty-icon-background.svg') no-repeat center center;
  background-size: cover;
`;

const ContractDetailWrapper = styled(Flex)`
  &:hover {
    ${IconWrapper} {
      background-color: ${COLOR.PURPLE_LIGHT_3};
      border-color: ${COLOR.BORDER_COLOR.HOVER.DEFAULT};
    }
  }
`;

const COUNTDOWN_VALUE_STYLE = {
  fontSize: 16,
  color: COLOR.TEXT_NEUTRAL_SECONDARY,
};

type ContractDetailsSectionProps = {
  icon: ReactNode;
  title: string;
  value: string;
};
const ContractDetailsSection = ({
  icon,
  title,
  value,
}: ContractDetailsSectionProps) => (
  <Tooltip title={title} trigger="hover">
    <ContractDetailWrapper justify="center" align="center" vertical flex={1}>
      <IconWrapper justify="center" align="center">
        {icon}
      </IconWrapper>
      <Title level={5} className="mt-16 mb-0">
        {value}
      </Title>
    </ContractDetailWrapper>
  </Tooltip>
);

export const StakingContractDetails = () => {
  const { goto } = usePageState();
  const {
    activeStakingProgramId,
    defaultStakingProgramId,
    isActiveStakingProgramLoaded,
    selectedStakingProgramMeta,
  } = useStakingProgram();
  const currentStakingProgramId = isActiveStakingProgramLoaded
    ? activeStakingProgramId || defaultStakingProgramId
    : null;
  const { stakingContractInfo } = useStakingContractDetails(
    currentStakingProgramId,
  );
  const {
    epochCounter,
    olasStakeRequired,
    apy,
    rewardsPerWorkPeriod,
    livenessPeriod,
  } = stakingContractInfo || {};
  const { currentEpochLifetime } = useStakingDetails();

  if (!stakingContractInfo || !selectedStakingProgramMeta) return null;
  return (
    <Flex vertical gap={12}>
      <Flex justify="space-between" align="center">
        <Flex align="center" gap={8}>
          <Title level={5} className="m-0">
            {selectedStakingProgramMeta?.name}
          </Title>
          <InfoTooltip iconColor={COLOR.BLACK} iconSize={18}>
            This is the staking contract your agent is currently joined to. The
            contract sets the rules for earning staking rewards — required
            behavior, reward rate, and required staking deposit. An agent can
            participate in only one contract at a time.
          </InfoTooltip>
        </Flex>
        <Button size="small" onClick={() => goto(PAGES.SelectStaking)}>
          Switch Staking Contract
        </Button>
      </Flex>

      <CardFlex $noBorder $padding="32px 0 0" $newStyles>
        <Flex justify="space-between" gap={24} flex={1} className="px-24 pb-32">
          <ContractDetailsSection
            icon={<TbSquareRoundedPercentage size={24} color={COLOR.PRIMARY} />}
            title="Annual Percentage Yield"
            value={apy ? `${apy}%` : NA}
          />

          <ContractDetailsSection
            icon={<TbSparkles size={24} color={COLOR.PRIMARY} />}
            title="Staking rewards per epoch"
            value={
              rewardsPerWorkPeriod
                ? `~${rewardsPerWorkPeriod?.toFixed(2)} OLAS`
                : NA
            }
          />

          <ContractDetailsSection
            icon={<TbLock size={24} color={COLOR.PRIMARY} />}
            title="Staking deposits"
            value={olasStakeRequired ? `${olasStakeRequired} OLAS` : NA}
          />
        </Flex>

        <Divider />

        {currentEpochLifetime && (
          <Flex align="center" justify="center" gap={4} className="mt-16 mb-16">
            <Text type="secondary">Current Epoch {epochCounter} ends in </Text>
            <Timer
              type="countdown"
              value={currentEpochLifetime}
              valueStyle={COUNTDOWN_VALUE_STYLE}
            />
            <InfoTooltip>
              An epoch is the contract&apos;s reward cycle, roughly{' '}
              {livenessPeriod ? secondsToHours(livenessPeriod) : `${NA}`}. Your
              agent must meet the staking criteria within this cycle to earn
              rewards; otherwise, it starts over in the next epoch.
            </InfoTooltip>
          </Flex>
        )}
      </CardFlex>
    </Flex>
  );
};
