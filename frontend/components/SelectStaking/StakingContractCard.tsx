import { Flex, Tag, Typography } from 'antd';
import styled from 'styled-components';

import { ContractSvg } from '@/components/custom-icons/Contract';
import { LockSvg } from '@/components/custom-icons/Lock';
import { PercentageSvg } from '@/components/custom-icons/Percentage';
import { SparklesSvg } from '@/components/custom-icons/Sparkles';
import { CardFlex } from '@/components/ui/CardFlex';
import { Divider } from '@/components/ui/Divider';
import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { COLOR } from '@/constants/colors';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useServices } from '@/hooks/useServices';
import { useStakingContractContext } from '@/hooks/useStakingContractDetails';

import { SlotsLeft } from './SlotsLeft';
import { SwitchStakingButton } from './SwitchStakingButton';

const { Text, Title } = Typography;

const ContractCard = styled(CardFlex)<{ $isConfirmSwitchPage?: boolean }>`
  width: 360px;
  border-color: ${COLOR.WHITE};

  ${(props) =>
    props.$isConfirmSwitchPage &&
    `
    width: 342px;
    padding-bottom: 24px;
  `}
`;

type StakingContractProps = {
  stakingProgramId: StakingProgramId;
  isCurrentStakingProgram: boolean;
  isConfirmSwitchPage?: boolean;
};

export const StakingContract = ({
  stakingProgramId,
  isCurrentStakingProgram,
  isConfirmSwitchPage = false,
}: StakingContractProps) => {
  const { selectedAgentConfig } = useServices();
  const stakingProgramMeta =
    STAKING_PROGRAMS[selectedAgentConfig.evmHomeChainId][stakingProgramId];
  const { allStakingContractDetailsRecord } = useStakingContractContext();
  const contractDetails = allStakingContractDetailsRecord?.[stakingProgramId];
  return (
    <ContractCard $noBodyPadding $isConfirmSwitchPage={isConfirmSwitchPage}>
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

      {!isConfirmSwitchPage && (
        <SlotsLeft
          contractDetails={contractDetails}
          isCurrentStakingProgram={isCurrentStakingProgram}
        />
      )}

      {!isConfirmSwitchPage && (
        <SwitchStakingButton
          isCurrentStakingProgram={isCurrentStakingProgram}
          stakingProgramId={stakingProgramId}
        />
      )}
    </ContractCard>
  );
};
