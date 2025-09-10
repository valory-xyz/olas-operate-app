import { ArrowRightOutlined } from '@ant-design/icons';
import { Flex, Typography } from 'antd';
import styled from 'styled-components';

import { COLOR } from '@/constants/colors';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { BackButton } from '../ui/BackButton';
import { ContractCard } from './ContractCard';
import { CtaSection } from './CtaSection';

const { Title, Text } = Typography;

const CircleButton = styled(Flex)`
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
        <CircleButton>
          <ArrowRightOutlined />
        </CircleButton>
        <ContractCard
          stakingProgramId={stakingProgramIdToMigrateTo}
          isCurrentStakingProgram={false}
        />
      </Flex>

      <CtaSection />
    </Flex>
  );
};
