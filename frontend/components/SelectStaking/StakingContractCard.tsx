import { Button, Flex, Tag, Typography } from 'antd';
import { useMemo } from 'react';
import styled from 'styled-components';

import { ContractSvg } from '@/components/custom-icons/Contract';
import { LockSvg } from '@/components/custom-icons/Lock';
import { PercentageSvg } from '@/components/custom-icons/Percentage';
import { SparklesSvg } from '@/components/custom-icons/Sparkles';
import { CardFlex } from '@/components/ui/CardFlex';
import { Divider } from '@/components/ui/Divider';
import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { COLOR } from '@/constants/colors';
import { Pages } from '@/enums/Pages';
import { StakingProgramId } from '@/enums/StakingProgram';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { useStakingContractContext } from '@/hooks/useStakingContractDetails';

import { Progress } from '../ui/Progress';

const { Text, Title } = Typography;

const ContractCard = styled(CardFlex)`
  width: 360px;
  border-color: ${COLOR.WHITE};
`;

type StakingContractProps = {
  stakingProgramId: StakingProgramId;
  isCurrentStakingProgram: boolean;
};

export const StakingContract = ({
  stakingProgramId,
  isCurrentStakingProgram,
}: StakingContractProps) => {
  const { goto } = usePageState();
  const { selectedAgentConfig } = useServices();
  const stakingProgramMeta =
    STAKING_PROGRAMS[selectedAgentConfig.evmHomeChainId][stakingProgramId];
  const { allStakingContractDetailsRecord } = useStakingContractContext();

  const contractDetails = allStakingContractDetailsRecord?.[stakingProgramId];
  const maxSlots = contractDetails?.maxNumServices;
  const slotsLeft =
    maxSlots && contractDetails?.serviceIds
      ? maxSlots - contractDetails.serviceIds.length
      : 0;
  const slotPercentage = useMemo(() => {
    return maxSlots && contractDetails?.serviceIds
      ? (contractDetails.serviceIds.length / maxSlots) * 100
      : 0;
  }, [contractDetails, maxSlots]);

  return (
    <ContractCard $noBodyPadding>
      <Flex gap={24} vertical className="px-24 py-24">
        <Tag
          className="flex align-center py-4 px-8 radius-8 w-max-content"
          style={{ borderColor: COLOR.GRAY_1 }}
        >
          <ContractSvg width={16} height={16} className="mr-6" />
          <Text className="text-sm text-neutral-tertiary">
            {stakingProgramMeta.name}
          </Text>
        </Tag>
        <Flex align="center" gap={6}>
          <PercentageSvg width={20} fill={COLOR.TEXT_NEUTRAL_TERTIARY} />{' '}
          <Title level={3} className="m-0">
            {contractDetails?.apy}%
          </Title>
          <Text type="secondary" className="ml-2">
            APR
          </Text>
        </Flex>
      </Flex>

      <Divider />

      <Flex vertical gap={12} className="px-24 pt-24">
        <Flex align="center" gap={10}>
          <SparklesSvg width={20} fill={COLOR.TEXT_NEUTRAL_TERTIARY} />{' '}
          <Text type="secondary">
            ~{contractDetails?.rewardsPerWorkPeriod?.toFixed(2)} OLAS - rewards
            per epoch
          </Text>
        </Flex>

        <Flex align="center" gap={10}>
          <LockSvg width={20} fill={COLOR.TEXT_NEUTRAL_TERTIARY} />{' '}
          <Text type="secondary">
            {contractDetails?.olasStakeRequired} OLAS - staking deposit
          </Text>
        </Flex>
      </Flex>

      <Flex vertical className="px-24 pt-24 mt-16">
        <Flex align="center" justify="space-between">
          <Text type="secondary" className="text-sm text-neutral-tertiary">
            Slots left
          </Text>
          <Text className="text-sm text-neutral-tertiary">
            {slotsLeft} / {maxSlots}
          </Text>
        </Flex>
        <Progress
          percent={slotPercentage}
          strokeColor={
            isCurrentStakingProgram ? COLOR.TEXT_NEUTRAL_TERTIARY : COLOR.PURPLE
          }
          trailColor={COLOR.GRAY_3}
          showInfo={false}
        />
      </Flex>

      <Flex className="px-24 py-24">
        <Button
          size="large"
          type={isCurrentStakingProgram ? 'default' : 'primary'}
          onClick={() => goto(Pages.ManageStaking)}
          block
          disabled={isCurrentStakingProgram}
        >
          {isCurrentStakingProgram
            ? 'Current Contract'
            : 'Switch Staking Contract'}
        </Button>
      </Flex>
    </ContractCard>
  );
};
