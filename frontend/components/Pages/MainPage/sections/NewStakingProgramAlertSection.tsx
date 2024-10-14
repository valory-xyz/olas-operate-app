import { Button, Flex, Typography } from 'antd';

import { Pages } from '@/enums/PageState';
import { usePageState } from '@/hooks/usePageState';

import { CustomAlert } from '../../../Alert';
import { CardSection } from '../../../styled/CardSection';

const { Text } = Typography;

export const NewStakingProgramAlertSection = () => {
  const { goto } = usePageState();

  return (
    <CardSection>
      <CustomAlert
        type="info"
        fullWidth
        showIcon
        message={
          <Flex vertical gap={2}>
            <Text>A new staking contract is available for your agent!</Text>
            <Button
              type="default"
              size="large"
              onClick={() => goto(Pages.ManageStaking)}
              style={{ width: 90 }}
            >
              Review
            </Button>
          </Flex>
        }
      />
    </CardSection>
  );
};
