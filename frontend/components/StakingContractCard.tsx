import { Flex, Popover, Tag, Typography } from 'antd';
import { LuInfo } from 'react-icons/lu';
import {
  TbFileText,
  TbLock,
  TbSparkles,
  TbSquareRoundedPercentage,
} from 'react-icons/tb';
import styled from 'styled-components';

import { CardFlex } from '@/components/ui/CardFlex';
import { Divider } from '@/components/ui/Divider';
import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { COLOR, StakingProgramId } from '@/constants';
import { useServices } from '@/hooks';
import { useStakingContractContext } from '@/hooks/useStakingContractDetails';
import { StakingContractDetails } from '@/types';

const { Text, Title } = Typography;

const ContractCard = styled(CardFlex)<{ $isView?: boolean }>`
  width: 360px;
  border-color: ${COLOR.WHITE};

  ${(props) =>
    props.$isView &&
    `width: 342px;
    padding-bottom: 24px;`}
`;

const ContractTag = styled(Tag)`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  width: max-content;
  border-radius: 8px;
  border-color: ${COLOR.GRAY_1};
`;

const ConfigurationDetails = () => {
  return (
    <Popover>
      <Flex vertical gap={12} style={{ minWidth: 300 }}>
        <Flex vertical gap={8}>
          <Flex align="center" gap={6}>
            <Text className="text-sm text-neutral-tertiary">
              Contract name:
            </Text>
            <Text className="text-sm">Pearl Beta II</Text>
          </Flex>

          <Flex align="center" gap={6}>
            <Text className="text-sm text-neutral-tertiary">
              Available slots:
            </Text>
            <Text className="text-sm">14/100</Text>
          </Flex>
        </Flex>

        <a href="" target="_blank" rel="noopener noreferrer">
          <Flex align="center" gap={6}>
            <Text className="text-sm text-primary">View more details</Text>
            <Text className="text-primary" style={{ fontSize: 10 }}>
              ↗
            </Text>
          </Flex>
        </a>
      </Flex>
    </Popover>
  );
};

type StakingContractCardProps = {
  stakingProgramId: StakingProgramId;
  renderAction?: (
    contractDetails: Partial<StakingContractDetails> | undefined,
  ) => React.ReactNode;
};

export const StakingContractCard = ({
  stakingProgramId,
  renderAction,
}: StakingContractCardProps) => {
  const { selectedAgentConfig } = useServices();
  const stakingProgramMeta =
    STAKING_PROGRAMS[selectedAgentConfig.evmHomeChainId][stakingProgramId];
  const { allStakingContractDetailsRecord } = useStakingContractContext();
  const contractDetails = allStakingContractDetailsRecord?.[stakingProgramId];

  return (
    <ContractCard $noBodyPadding $isView={!renderAction}>
      <Flex gap={24} vertical className="px-24 py-24">
        <ContractTag>
          <TbFileText size={16} color={COLOR.TEXT_NEUTRAL_SECONDARY} />
          <Text className="text-sm text-neutral-secondary">
            {stakingProgramMeta.name}
          </Text>
        </ContractTag>

        <Flex align="center" justify="space-between">
          <Flex align="center" gap={6}>
            <TbSquareRoundedPercentage
              size={20}
              color={COLOR.TEXT_NEUTRAL_TERTIARY}
            />
            <Title level={3} className="m-0">
              {contractDetails?.apy}%
            </Title>
            <Text type="secondary" className="ml-2">
              APR
            </Text>
          </Flex>
          <Popover
            content={<ConfigurationDetails />}
            title="Configuration details"
          >
            <LuInfo style={{ color: COLOR.TEXT_NEUTRAL_TERTIARY }} />
          </Popover>
        </Flex>
      </Flex>

      <Divider />

      <Flex vertical gap={12} className="px-24 pt-24">
        <Flex align="center" gap={10}>
          <TbSparkles size={20} color={COLOR.TEXT_NEUTRAL_TERTIARY} />
          <Text type="secondary">
            ~{contractDetails?.rewardsPerWorkPeriod?.toFixed(2)} OLAS – activity
            reward
          </Text>
        </Flex>

        <Flex align="center" gap={10}>
          <TbLock size={20} color={COLOR.TEXT_NEUTRAL_TERTIARY} />
          <Text type="secondary">
            {contractDetails?.olasStakeRequired} OLAS – required deposit
          </Text>
        </Flex>
      </Flex>

      {renderAction?.(contractDetails)}
    </ContractCard>
  );
};
