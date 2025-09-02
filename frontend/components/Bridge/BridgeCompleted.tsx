import { Button, Flex, Result } from 'antd';

import { BridgeTransferFlow } from '@/components/Bridge/BridgeTransferFlow';
import { GoToMainPageButton } from '@/components/Pages/GoToMainPageButton';
import { CardFlex } from '@/components/styled/CardFlex';
import { Title3 } from '@/components/ui/Typography';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { CrossChainTransferDetails } from '@/types/Bridge';

type BridgeCompletedProps = Omit<CrossChainTransferDetails, 'eta'> & {
  completionMessage?: string;
};

const CARD_WIDTH = 624;

/**
 * Final screen displayed when the bridging process is completed.
 * It shows the transfer details and a button to navigate to the wallet balance page.
 */
export const BridgeCompleted = ({
  fromChain,
  toChain,
  transfers,
  completionMessage,
}: BridgeCompletedProps) => {
  const { goto } = usePageState();

  return (
    <Flex justify="center" style={{ marginTop: 40 }}>
      <CardFlex
        $noBorder
        bordered={false}
        style={{ width: CARD_WIDTH, padding: 8 }}
      >
        <Flex justify="space-between" align="center">
          <Title3>Bridge Completed</Title3>
          <GoToMainPageButton />
        </Flex>
        <Result
          status="success"
          subTitle={
            completionMessage || 'Funds have been bridged successfully.'
          }
          extra={[
            <Flex key="bridge-completed" gap={24} vertical className="pt-8">
              <BridgeTransferFlow
                fromChain={fromChain}
                toChain={toChain}
                transfers={transfers}
                isBridgeCompleted
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
    </Flex>
  );
};
