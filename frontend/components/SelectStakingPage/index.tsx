import { Flex, Typography } from 'antd';
import styled from 'styled-components';

import { MAIN_CONTENT_MAX_WIDTH } from '@/constants';
import { Pages } from '@/enums';
import { usePageState, useStakingContracts } from '@/hooks';

import { StakingContractCard } from '../StakingContractCard';
import { BackButton } from '../ui/BackButton';
import { SelectStakingButton } from './SelectStakingButton';
import { SlotsLeft } from './SlotsLeft';
import { SwitchStakingButton } from './SwitchStakingButton';

const { Title } = Typography;

const StakingContractsWrapper = styled.div`
  display: grid;
  grid-template-columns: auto auto;
  justify-content: center;
  gap: 24px;
`;

type SelectStakingProps = {
  mode: 'onboard' | 'migrate';
};

export const SelectStaking = ({ mode }: SelectStakingProps) => {
  const { orderedStakingProgramIds, currentStakingProgramId } =
    useStakingContracts();

  const { goto: gotoPage } = usePageState();

  return (
    <Flex vertical justify="center" className="w-full">
      <Flex
        vertical
        className="mx-auto"
        style={{ width: MAIN_CONTENT_MAX_WIDTH }}
      >
        <BackButton onPrev={() => gotoPage(Pages.Main)} />
        <Title level={3} className="mt-12 mb-32">
          Select Staking Contract
        </Title>
      </Flex>

      <StakingContractsWrapper>
        {orderedStakingProgramIds.map((stakingProgramId) => (
          <StakingContractCard
            key={stakingProgramId}
            stakingProgramId={stakingProgramId}
            renderAction={(contractDetails) => {
              const isCurrentStakingProgram =
                stakingProgramId === currentStakingProgramId;
              return (
                <>
                  <SlotsLeft
                    contractDetails={contractDetails}
                    isCurrentStakingProgram={isCurrentStakingProgram}
                  />
                  {mode === 'switch' && (
                    <SwitchStakingButton
                      isCurrentStakingProgram={isCurrentStakingProgram}
                      stakingProgramId={stakingProgramId}
                    />
                  )}
                  {mode === 'select' && (
                    <SelectStakingButton stakingProgramId={stakingProgramId} />
                  )}
                </>
              );
            }}
          />
        ))}
      </StakingContractsWrapper>
    </Flex>
  );
};
