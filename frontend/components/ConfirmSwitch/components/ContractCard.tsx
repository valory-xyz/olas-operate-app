import { Flex, Typography } from 'antd';
import styled from 'styled-components';

import { StakingContractCard } from '@/components/StakingContractCard';
import { COLOR, StakingProgramId } from '@/constants';

const { Text } = Typography;

const MARGIN_TOP = 12;

const CardHeader = styled(Flex)<{ $isCurrentStakingProgram: boolean }>`
  width: 342px;
  height: calc(40px + ${MARGIN_TOP}px);
  margin-bottom: -${MARGIN_TOP}px;
  border-radius: 20px 20px 0 0;
  border: 1px solid ${COLOR.WHITE};
  background-color: ${({ $isCurrentStakingProgram }) =>
    $isCurrentStakingProgram ? COLOR.GRAY_3 : COLOR.PURPLE_LIGHT_4};
`;

type ContractCardProps = {
  stakingProgramId: StakingProgramId;
  isCurrentStakingProgram: boolean;
};

export const ContractCard = ({
  stakingProgramId,
  isCurrentStakingProgram,
}: ContractCardProps) => {
  const textClass = isCurrentStakingProgram
    ? 'text-neutral-secondary'
    : 'text-primary';

  return (
    <Flex vertical>
      <CardHeader
        justify="center"
        $isCurrentStakingProgram={isCurrentStakingProgram}
      >
        <Text className={`text-sm mt-8 ${textClass}`}>
          {isCurrentStakingProgram ? 'Current Contract' : 'New Contract'}
        </Text>
      </CardHeader>
      <StakingContractCard stakingProgramId={stakingProgramId} />
    </Flex>
  );
};
