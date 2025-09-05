import { Button, Flex, Typography } from 'antd';
import styled from 'styled-components';

import { CardFlex } from '@/components/styled/CardFlex';
import { Divider } from '@/components/styled/Divider';
import { Tooltip } from '@/components/ui/Tooltip';
import { COLOR } from '@/constants/colors';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { useStakingContractDetails } from '@/hooks/useStakingContractDetails';
import { useStakingDetails } from '@/hooks/useStakingDetails';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { LockSvg } from '../custom-icons/Lock';
import { PercentagsSvg } from '../custom-icons/Percentags';
import { SparklesSvg } from '../custom-icons/Sparkles';

const { Title, Text } = Typography;

const IconWrapper = styled(Flex)`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  border: 1px solid ${COLOR.PURPLE_LIGHT_4};
  transition: background-color 0.2s ease;
`;

const ContractDetailWrapper = styled(Flex)`
  &:hover {
    ${IconWrapper} {
      background-color: ${COLOR.PURPLE_LIGHT_3};
    }
  }
`;

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

  if (!stakingContractInfo) return null;
  return (
    <Flex vertical gap={12}>
      <Flex justify="space-between" align="center">
        <Title level={4} className="m-0">
          {selectedStakingProgramMeta?.name}
        </Title>
        <Button size="small" onClick={() => goto(Pages.ManageStaking)}>
          Switch Staking Contract
        </Button>
      </Flex>

      <CardFlex $noBorder $padding="32px 0 0">
        <Flex justify="space-between" gap={24} flex={1} className="px-24 pb-32">
          <Tooltip title="Annual Percentage Yield" trigger="hover">
            <ContractDetailWrapper
              justify="center"
              align="center"
              vertical
              flex={1}
            >
              <IconWrapper justify="center" align="center">
                <PercentagsSvg />
              </IconWrapper>
              <Title level={5} className="mt-16 mb-0">
                {apy}%
              </Title>
            </ContractDetailWrapper>
          </Tooltip>

          <Tooltip title="Staking rewards per epoch" trigger="hover">
            <ContractDetailWrapper
              justify="center"
              align="center"
              vertical
              flex={1}
            >
              <IconWrapper justify="center">
                <SparklesSvg />
              </IconWrapper>
              <Title level={5} className="mt-16 mb-0">
                ~{rewardsPerWorkPeriod?.toFixed(2)} OLAS
              </Title>
            </ContractDetailWrapper>
          </Tooltip>

          <Tooltip title="Staking deposite" trigger="hover">
            <ContractDetailWrapper
              justify="center"
              align="center"
              vertical
              flex={1}
            >
              <IconWrapper justify="center">
                <LockSvg />
              </IconWrapper>
              <Title level={5} className="mt-16 mb-0">
                {olasStakeRequired} OLAS
              </Title>
            </ContractDetailWrapper>
          </Tooltip>
        </Flex>

        <Divider />

        <Text type="secondary" className="mt-16 mb-16 text-center">
          Current Epoch {epochCounter} ends in {currentEpochLifetime}
        </Text>
      </CardFlex>
    </Flex>
  );
};
