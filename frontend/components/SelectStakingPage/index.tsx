import { Flex, Typography } from 'antd';
import styled from 'styled-components';

import { MAIN_CONTENT_MAX_WIDTH, PAGES } from '@/constants';
import { usePageState, useServices, useStakingContracts } from '@/hooks';

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

export const SelectStakingPage = ({ mode }: SelectStakingProps) => {
  const { goto: gotoPage } = usePageState();
  const { selectedService } = useServices();
  const { orderedStakingProgramIds, currentStakingProgramId } =
    useStakingContracts();

  return (
    <Flex vertical justify="center" className="w-full">
      <Flex
        vertical
        className="mx-auto"
        style={{ width: MAIN_CONTENT_MAX_WIDTH }}
      >
        {/* Do not allow going back if service is not yet created */}
        {selectedService && <BackButton onPrev={() => gotoPage(PAGES.Main)} />}
        <Title level={3} className="mt-12 mb-32">
          Select Activity Rewards Configuration
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
                  {mode === 'migrate' && (
                    <SwitchStakingButton
                      isCurrentStakingProgram={isCurrentStakingProgram}
                      stakingProgramId={stakingProgramId}
                    />
                  )}
                  {mode === 'onboard' && (
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
