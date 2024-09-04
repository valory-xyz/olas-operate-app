import { RightOutlined } from '@ant-design/icons';
import { Button, Flex, Skeleton, Typography } from 'antd';

import { Pages } from '@/enums/PageState';
import { usePageState } from '@/hooks/usePageState';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { CardSection } from '../../styled/CardSection';

const { Text } = Typography;

export const StakingContractUpdate = () => {
  const { goto } = usePageState();
  const { activeStakingProgramMeta, isLoadedActiveStakingProgram } =
    useStakingProgram();

  return (
    <CardSection bordertop="true" padding="16px 24px">
      <Flex
        gap={16}
        justify="space-between"
        align="center"
        style={{ width: '100%' }}
      >
        <Text type="secondary">Staking contract</Text>

        {isLoadedActiveStakingProgram ? (
          <Button
            type="link"
            className="p-0"
            onClick={() => goto(Pages.ManageStaking)}
          >
            {activeStakingProgramMeta ? (
              <>
                {activeStakingProgramMeta.name}
                &nbsp;
                <RightOutlined />
              </>
            ) : (
              'Not staked'
            )}
          </Button>
        ) : (
          <Skeleton.Input />
        )}
      </Flex>
    </CardSection>
  );
};
