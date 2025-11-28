import { ArrowRightOutlined } from '@ant-design/icons';
import { Flex, Typography } from 'antd';
import styled from 'styled-components';

import { COLOR, MAIN_CONTENT_MAX_WIDTH, PAGES } from '@/constants';
import { usePageState, useStakingContracts, useStakingProgram } from '@/hooks';

import { BackButton } from '../ui/BackButton';
import { ConfirmSwitchSection } from './components/ConfirmSwitchSection';
import { ContractCard } from './components/ContractCard';

const { Title, Text } = Typography;

const CircularIconContainer = styled(Flex)`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  background-color: ${COLOR.WHITE};
`;

export const ConfirmSwitch = () => {
  const { goto } = usePageState();
  const { stakingProgramIdToMigrateTo } = useStakingProgram();
  const { currentStakingProgramId } = useStakingContracts();

  if (!currentStakingProgramId || !stakingProgramIdToMigrateTo) return null;

  return (
    <Flex
      vertical
      className="mx-auto"
      style={{ width: MAIN_CONTENT_MAX_WIDTH }}
    >
      <BackButton onPrev={() => goto(PAGES.SelectStaking)} />
      <Title level={3} className="my-12">
        Confirm Switch
      </Title>
      <Text type="secondary">
        Review contract details and confirm. Changes will take effect
        immediately.
      </Text>

      <Flex gap={12} className="mt-32" align="center">
        <ContractCard
          stakingProgramId={currentStakingProgramId}
          isCurrentStakingProgram={true}
        />
        <CircularIconContainer align="center" justify="center">
          <ArrowRightOutlined />
        </CircularIconContainer>
        <ContractCard
          stakingProgramId={stakingProgramIdToMigrateTo}
          isCurrentStakingProgram={false}
        />
      </Flex>

      <ConfirmSwitchSection />
    </Flex>
  );
};
