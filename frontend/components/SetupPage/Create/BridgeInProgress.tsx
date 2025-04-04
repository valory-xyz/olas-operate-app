import { Flex, Typography } from 'antd';
import { useEffect, useMemo } from 'react';

import { CustomAlert } from '@/components/Alert';
import { BridgeTransferFlow } from '@/components/bridge/BridgeTransferFlow';
import { BridgingSteps } from '@/components/bridge/BridgingSteps';
import { CardFlex } from '@/components/styled/CardFlex';
import { SetupScreen } from '@/enums/SetupScreen';
import { TokenSymbol } from '@/enums/Token';
import { useSetup } from '@/hooks/useSetup';
import { BridgingStepStatus } from '@/types/Bridge';

import { SetupCreateHeader } from './SetupCreateHeader';

const { Text, Title } = Typography;

const KeepAppOpenAlert = () => (
  <CustomAlert
    type="warning"
    fullWidth
    showIcon
    message={
      <Text className="text-sm">
        Keep the app open until bridging is complete.
      </Text>
    }
  />
);

// TODO: to update
const EstimatedCompletionTime = () => (
  <Flex gap={8}>
    <Text type="secondary">Estimated completion time:</Text>
    <Text strong>~ 5 minutes</Text>
    <Text type="secondary">(0:05)</Text>
  </Flex>
);

// TODO: integrate with the API
const useBridgeTransfers = () => {
  return {
    fromChain: 'Ethereum',
    toChain: 'Base',
    transfers: [
      {
        fromSymbol: TokenSymbol.OLAS,
        fromAmount: '100000000000000000000',
        toSymbol: TokenSymbol.OLAS,
        toAmount: '100000000000000000000',
      },
      {
        fromSymbol: TokenSymbol.ETH,
        fromAmount: '5500000000000000',
        toSymbol: TokenSymbol.ETH,
        toAmount: '5000000000000000',
      },
    ],
  };
};

// TODO: to update
const useBridgingSteps = () => ({
  isLoading: false,
  isError: false,
  data: {
    status: 'FINISHED',
    isBridgingFailed: false,
    executions: [
      {
        symbol: 'OLAS' as TokenSymbol,
        status: 'finish' as BridgingStepStatus,
        txnLink:
          'https://scan.li.fi/tx/0x3795206347eae1537d852bea05e36c3e76b08cefdfa2d772e24bac2e24f31db3',
      },
      {
        symbol: 'OLAS' as TokenSymbol,
        status: 'finish' as BridgingStepStatus,
        txnLink: '',
      },
    ],
  },
});

/**
 * Bridge in progress screen.
 */
export const BridgeInProgress = () => {
  const { goto } = useSetup();
  const { fromChain, toChain, transfers } = useBridgeTransfers();
  const { isLoading, isError, data: bridge } = useBridgingSteps();

  const isBridgingSuccess = false; // TODO: from the API
  useEffect(() => {
    if (isBridgingSuccess) {
      goto(SetupScreen.SetupCreateSafe);
    }
  }, [isBridgingSuccess, goto]);

  const bridgeDetails = useMemo(() => {
    if (isLoading || isError) return null;
    if (!bridge) return null;

    const currentBridgeStatus: BridgingStepStatus = (() => {
      if (bridge.isBridgingFailed) return 'error';
      return bridge.status === 'FINISHED' ? 'finish' : 'process';
    })() as BridgingStepStatus; // "as" to be removed when the API is updated

    return {
      status: currentBridgeStatus,
      executions: bridge.executions.map(({ symbol, status, txnLink }) => ({
        symbol,
        status,
        txnLink,
      })),
    };
  }, [isLoading, isError, bridge]);

  return (
    <>
      <CardFlex $noBorder $gap={20} $padding="0 24px">
        <SetupCreateHeader />
        <Title level={3} className="m-0">
          Bridging in progress
        </Title>
      </CardFlex>
      <KeepAppOpenAlert />

      <CardFlex $noBorder $gap={20} $padding="0 24px">
        <BridgeTransferFlow
          fromChain={fromChain}
          toChain={toChain}
          transfers={transfers}
        />
        <EstimatedCompletionTime />
        {!!bridgeDetails && (
          <BridgingSteps
            chainName="Base" // TODO: from the API
            bridge={bridgeDetails} // TODO: from the API
            masterSafe={{
              // TODO: from the API
              creation: { status: 'process', txnLink: null },
              transfer: { status: 'wait', txnLink: null },
            }}
          />
        )}
      </CardFlex>
    </>
  );
};
