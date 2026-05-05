import { Button, Flex, Typography } from 'antd';
import { ReactNode } from 'react';
import styled from 'styled-components';

import { COLOR } from '@/constants';
import { useServices } from '@/hooks';

import { StakingContractCard } from '../../StakingContractCard';
import { SelectStakingButton } from './SelectStakingButton';

const { Title, Text } = Typography;

const ConfigureStakingContractCardContainer = styled.div`
  background-color: ${COLOR.GRAY_3};
  border-radius: 16px;
  > .ant-typography {
    display: inline-block;
    text-align: center;
    width: 100%;
    padding: 8px 0px;
    border-top-left-radius: inherit;
    border-top-right-radius: inherit;
  }
  .ant-card {
    width: 100%;
  }
`;

type ConfigureActivityRewardsProps = {
  backButton?: ReactNode;
  onChangeConfiguration: () => void;
};

export const ConfigureActivityRewards = ({
  backButton,
  onChangeConfiguration,
}: ConfigureActivityRewardsProps) => {
  const { selectedAgentConfig } = useServices();
  const defaultStakingProgramId = selectedAgentConfig.defaultStakingProgramId;

  return (
    <Flex
      vertical
      justify="center"
      gap={32}
      style={{ width: 516, margin: '0 auto' }}
    >
      <Flex vertical className="mx-auto">
        {backButton}
        <Title level={3} className="mt-12">
          Configure Activity Rewards
        </Title>
        <Text className="text-neutral-secondary">
          You can earn OLAS crypto for using your agent. Select the
          configuration – called Staking Contract – that suits you best.
        </Text>
      </Flex>

      <ConfigureStakingContractCardContainer>
        <Text className="text-neutral-secondary">
          Recommended configuration
        </Text>
        <StakingContractCard
          stakingProgramId={defaultStakingProgramId}
          renderAction={() => (
            <Flex className="px-24 pb-24 mt-40" gap={16}>
              <Button size="large" block onClick={onChangeConfiguration}>
                Change Configuration
              </Button>
              <SelectStakingButton
                stakingProgramId={defaultStakingProgramId}
                buttonLabelOverride="Continue"
              />
            </Flex>
          )}
        />
      </ConfigureStakingContractCardContainer>
    </Flex>
  );
};
