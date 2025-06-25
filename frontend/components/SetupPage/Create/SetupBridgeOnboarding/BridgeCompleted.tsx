import { Button, Flex, Result } from 'antd';

import { BridgeTransferFlow } from '@/components/bridge/BridgeTransferFlow';
import { CardTitle } from '@/components/Card/CardTitle';
import { GoToMainPageButton } from '@/components/Pages/GoToMainPageButton';
import { CardFlex } from '@/components/styled/CardFlex';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { CrossChainTransferDetails } from '@/types/Bridge';

type BridgeCompletedProps = Omit<CrossChainTransferDetails, 'eta'>;

export const BridgeCompleted = ({
  fromChain,
  toChain,
  transfers,
}: BridgeCompletedProps) => {
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
          <Flex
            key="bridge-completed"
            gap={24}
            vertical
            style={{ paddingTop: 8 }}
          >
            <BridgeTransferFlow
              fromChain={fromChain}
              toChain={toChain}
              transfers={transfers}
            />
            <Button
              onClick={() => goto(Pages.ManageWallet)}
              size="large"
              style={{ alignSelf: 'center' }}
            >
              See wallet balance
            </Button>
          </Flex>,
        ]}
        style={{ padding: '24px 0' }}
      />
    </CardFlex>
  );
};
