import { Button, Flex, Result } from 'antd';

import { CardTitle } from '@/components/Card/CardTitle';
import { GoToMainPageButton } from '@/components/Pages/GoToMainPageButton';
import { CardFlex } from '@/components/styled/CardFlex';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';

// const { Title, Text } = Typography;

export const BridgeCompleted = () => {
  const { goto } = usePageState();

  return (
    <CardFlex
      bordered={false}
      title={<CardTitle title="Bridge Completed" />}
      extra={<GoToMainPageButton />}
    >
      <Result
        status="success"
        // TODO: update with actual destination
        subTitle="Funds have been bridged to your Pearl Safe."
        extra={[
          <Flex key="bridge-completed" gap={16} vertical>
            <Button onClick={() => goto(Pages.ManageWallet)}>
              See wallet balance
            </Button>
          </Flex>,
        ]}
      />
    </CardFlex>
  );
};
