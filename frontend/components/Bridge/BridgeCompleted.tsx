import { Button, Flex, Result, Typography } from 'antd';

import { GoToMainPageButton } from '@/components/Pages/GoToMainPageButton';
import { CardFlex } from '@/components/ui';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks';
import { CrossChainTransferDetails } from '@/types/Bridge';

import { BridgeTransferFlow } from './BridgeTransferFlow';

const { Title } = Typography;

type BridgeCompletedProps = Omit<CrossChainTransferDetails, 'eta'> & {
  completionMessage?: string;
};

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
    <Flex justify="center" className="pt-48">
      <CardFlex $noBorder $onboarding className="p-8">
        <Flex justify="space-between" align="center">
          <Title level={3} className="mt-12">
            Bridge Completed
          </Title>
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
                className="self-center"
              >
                See wallet balance
              </Button>
            </Flex>,
          ]}
          className="py-24 px-0"
        />
      </CardFlex>
    </Flex>
  );
};
