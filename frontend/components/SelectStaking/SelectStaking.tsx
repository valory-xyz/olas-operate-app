import { Flex, Typography } from 'antd';
import styled from 'styled-components';

import { MAIN_CONTENT_MAX_WIDTH } from '@/constants/width';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';

import { BackButton } from '../ui/BackButton';
import { useStakingContracts } from './hooks/useStakingContracts';
import { StakingContract } from './StakingContractCard';

const { Title } = Typography;

const StakingContractsWrapper = styled.div`
  display: grid;
  grid-template-columns: auto auto;
  justify-content: center;
  gap: 24px;
`;

export const SelectStaking = () => {
  const { goto } = usePageState();
  const { orderedStakingProgramIds, currentStakingProgramId } =
    useStakingContracts();

  return (
    <Flex vertical justify="center" className="w-full">
      <Flex
        vertical
        className="mx-auto"
        style={{ width: MAIN_CONTENT_MAX_WIDTH }}
      >
        <BackButton onPrev={() => goto(Pages.Main)} />
        <Title level={3} className="mt-12 mb-32">
          Select Staking Contract
        </Title>
      </Flex>

      <StakingContractsWrapper>
        {orderedStakingProgramIds.map((stakingProgramId) => (
          <StakingContract
            key={stakingProgramId}
            stakingProgramId={stakingProgramId}
            isCurrentStakingProgram={
              stakingProgramId === currentStakingProgramId
            }
          />
        ))}
      </StakingContractsWrapper>
    </Flex>
  );
};
