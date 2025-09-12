import { Button, Flex, Statistic, Typography } from 'antd';
import styled from 'styled-components';

import { LockSvg } from '@/components/custom-icons/Lock';
import { PercentageOutlined } from '@/components/custom-icons/Percentage';
import { SparklesSvg } from '@/components/custom-icons/Sparkles';
import { CardFlex } from '@/components/ui/CardFlex';
import { Divider } from '@/components/ui/Divider';
import { Tooltip } from '@/components/ui/Tooltip';
import { COLOR } from '@/constants/colors';
import { NA } from '@/constants/symbols';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { useStakingContractDetails } from '@/hooks/useStakingContractDetails';
import { useStakingDetails } from '@/hooks/useStakingDetails';
import { useStakingProgram } from '@/hooks/useStakingProgram';

const { Title, Text } = Typography;
const { Countdown } = Statistic;

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

const ContractDetailsSection = ({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) => (
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
  const { activeStakingProgramId, selectedStakingProgramMeta } =
    useStakingProgram();
  const { stakingContractInfo } = useStakingContractDetails(
    activeStakingProgramId,
  );
  const { epochCounter, olasStakeRequired, apy, rewardsPerWorkPeriod } =
    stakingContractInfo || {};
  const { currentEpochLifetime } = useStakingDetails();

  if (!stakingContractInfo || !selectedStakingProgramMeta) return null;
  return (
    <Flex vertical gap={12}>
      <Flex justify="space-between" align="center">
        <Title level={5} className="m-0">
          {selectedStakingProgramMeta?.name}
        </Title>
        <Button size="small" onClick={() => goto(Pages.SelectStaking)}>
          Switch Staking Contract
        </Button>
      </Flex>

      <CardFlex $noBorder $padding="32px 0 0" $newStyles>
        <Flex justify="space-between" gap={24} flex={1} className="px-24 pb-32">
          <ContractDetailsSection
            icon={<PercentageOutlined />}
            title="Annual Percentage Yield"
            value={apy ? `${apy}%` : NA}
          />

          <ContractDetailsSection
            icon={<SparklesSvg />}
            title="Staking rewards per epoch"
            value={
              rewardsPerWorkPeriod
                ? `~${rewardsPerWorkPeriod?.toFixed(2)} OLAS`
                : NA
            }
          />

          <ContractDetailsSection
            icon={<LockSvg />}
            title="Staking deposits"
            value={olasStakeRequired ? `${olasStakeRequired} OLAS` : NA}
          />
        </Flex>

        <Divider />

        {currentEpochLifetime && (
          <Flex align="center" justify="center" gap={4} className="mt-16 mb-16">
            <Text type="secondary">Current Epoch {epochCounter} ends in </Text>
            <Countdown
              value={currentEpochLifetime}
              valueStyle={COUNTDOWN_VALUE_STYLE}
            />
          </Flex>
        )}
      </CardFlex>
    </Flex>
  );
};
