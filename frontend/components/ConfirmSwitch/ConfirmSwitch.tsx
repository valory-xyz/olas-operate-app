import { ArrowRightOutlined } from '@ant-design/icons';
import { Flex, Typography } from 'antd';
import styled from 'styled-components';

import { COLOR } from '@/constants/colors';
import { MAIN_CONTENT_MAX_WIDTH } from '@/constants/width';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { BackButton } from '../ui/BackButton';
import { ConfirmSwitchSection } from './ConfirmSwitchSection';
import { ContractCard } from './ContractCard';

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
  const {
    activeStakingProgramId,
    stakingProgramIdToMigrateTo,
    isActiveStakingProgramLoaded,
    defaultStakingProgramId,
  } = useStakingProgram();
  // Fallback if there are no active staking program.
  const currentStakingProgramId = isActiveStakingProgramLoaded
    ? activeStakingProgramId || defaultStakingProgramId
    : null;

  if (!currentStakingProgramId || !stakingProgramIdToMigrateTo) return null;

  return (
    <Flex
      vertical
      className="mx-auto"
      style={{ width: MAIN_CONTENT_MAX_WIDTH }}
    >
      <BackButton onPrev={() => goto(Pages.SelectStaking)} />
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
