import { ArrowRightOutlined } from '@ant-design/icons';
import { Flex, Typography } from 'antd';
import styled from 'styled-components';

import { COLOR } from '@/constants/colors';
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
  align-items: center;
  justify-content: center;
  background-color: ${COLOR.WHITE};
`;

export const ConfirmSwitch = () => {
  const { goto } = usePageState();
  const { activeStakingProgramId, stakingProgramIdToMigrateTo } =
    useStakingProgram();

  if (!activeStakingProgramId || !stakingProgramIdToMigrateTo) return null;

  return (
    <Flex vertical>
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
          stakingProgramId={activeStakingProgramId}
          isCurrentStakingProgram={true}
        />
        <CircularIconContainer>
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
