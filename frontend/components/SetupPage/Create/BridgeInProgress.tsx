import { Typography } from 'antd';
import { useEffect, useMemo } from 'react';

import { CustomAlert } from '@/components/Alert';
import { BridgeTransferFlow } from '@/components/bridge/BridgeTransferFlow';
import { BridgingSteps } from '@/components/bridge/BridgingSteps';
import { EstimatedCompletionTime } from '@/components/bridge/EstimatedCompletionTime';
import { CardFlex } from '@/components/styled/CardFlex';
import { ONE_SECOND_INTERVAL } from '@/constants/intervals';
import { Pages } from '@/enums/Pages';
import { TokenSymbol } from '@/enums/Token';
import { usePageState } from '@/hooks/usePageState';
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

const liFiTxnLink =
  'https://scan.li.fi/tx/0x3795206347eae1537d852bea05e36c3e76b08cefdfa2d772e24bac2e24f31db3';

// TODO: to remove
const txnLink =
  'https://etherscan.io/tx/0x3795206347eae1537d852bea05e36c3e76b08cefdfa2d772e24bac2e24f31db3';

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
        txnLink: liFiTxnLink,
      },
      {
        symbol: 'ETH' as TokenSymbol,
        status: 'finish' as BridgingStepStatus,
        txnLink: liFiTxnLink,
      },
    ],
  },
});

// TODO: to update
const useMasterSafeCreation = () => ({
  isLoading: false,
  isError: false,
  data: {
    isSafeCreated: true,
    txnLink:
      'https://etherscan.io/tx/0x3795206347eae1537d852bea05e36c3e76b08cefdfa2d772e24bac2e24f31db3',
  },
});

// TODO: to update
const useMasterSafeTransfers = () => ({
  isLoading: false,
  isError: false,
  data: {
    status: 'CREATED',
    transfers: [
      {
        symbol: 'OLAS' as TokenSymbol,
        status: 'wait' as BridgingStepStatus,
        txnLink: null,
      },
      {
        symbol: 'OLAS' as TokenSymbol,
        status: 'wait' as BridgingStepStatus,
        txnLink: null,
      },
    ],
  },
});

const useTimeRemaining = () => {
  const TIME_FOR_SAFE_CREATION = ONE_SECOND_INTERVAL * 4; // TODO: to update
  const TIME_FOR_MASTER_SAFE_TRANSFER = ONE_SECOND_INTERVAL * 4; // TODO: to update
  const timeToExecuteQuote = 1744690251; // TODO: to update
  return {
    isLoading: true,
    isError: false,
    timeRemaining:
      timeToExecuteQuote +
      TIME_FOR_SAFE_CREATION +
      TIME_FOR_MASTER_SAFE_TRANSFER,
  };
};

/**
 * Bridge in progress screen.
 */
export const BridgeInProgress = () => {
  const { goto } = usePageState();

  const { fromChain, toChain, transfers } = useBridgeTransfers();
  const { isLoading: isTimeRemainingLoading, timeRemaining } =
    useTimeRemaining();
  const {
    isLoading: isLoadingBridge,
    isError: isErrorBridge,
    data: bridge,
  } = useBridgingSteps();
  const {
    isLoading: isLoadingMasterSafeCreation,
    isError: isErrorMasterSafeCreation,
    data: masterSafeCreation,
  } = useMasterSafeCreation();
  const {
    isLoading: isLoadingMasterSafe,
    isError: isErrorMasterSafe,
    data: masterSafeTransfer,
  } = useMasterSafeTransfers();

  const isBridgingCompleted = bridge.status === 'FINISHED'; // TODO: from the API
  const isSafeCreated = masterSafeCreation?.isSafeCreated; // TODO: from the API
  const isTransferCompleted = masterSafeTransfer.status === 'FINISHED'; // TODO: from the API

  useEffect(() => {
    if (!isBridgingCompleted) return;
    if (!isSafeCreated) return;
    if (!isTransferCompleted) return;

    goto(Pages.Main);
  }, [isBridgingCompleted, isSafeCreated, isTransferCompleted, goto]);

  // TODO: to update and consolidate after the API integration (move to useQuery)
  const bridgeDetails = useMemo(() => {
    const currentBridgeStatus: BridgingStepStatus = (() => {
      if (!bridge) return 'wait';
      if (isLoadingBridge) return 'process';
      if (bridge.isBridgingFailed || isErrorBridge) return 'error';
      return isBridgingCompleted ? 'finish' : 'process';
    })();

    return {
      status: currentBridgeStatus,
      subSteps: bridge.executions,
    };
  }, [isLoadingBridge, isErrorBridge, isBridgingCompleted, bridge]);

  // TODO: to update and consolidate after the API integration (move to useQuery)
  const masterSafeCreationDetails = useMemo(() => {
    const currentMasterSafeCreationStatus: BridgingStepStatus = (() => {
      if (isErrorMasterSafeCreation) return 'error';
      if (!isBridgingCompleted) return 'wait';
      if (isLoadingMasterSafeCreation) return 'process';
      if (isSafeCreated) return 'finish';
      return 'process';
    })();

    const creationTxnLink = (() => {
      if (isSafeCreated) return txnLink;
      return null;
    })();

    return {
      status: currentMasterSafeCreationStatus,
      subSteps: [{ txnLink: creationTxnLink }],
    };
  }, [
    isBridgingCompleted,
    isSafeCreated,
    isLoadingMasterSafeCreation,
    isErrorMasterSafeCreation,
  ]);

  // TODO: to update and consolidate after the API integration (move to useQuery)
  const masterSafeTransferDetails = useMemo(() => {
    const currentMasterSafeStatus: BridgingStepStatus = (() => {
      if (isErrorMasterSafe) return 'error';
      if (isLoadingMasterSafe || isSafeCreated) return 'process';
      return isTransferCompleted ? 'finish' : 'wait';
    })();

    return {
      status: currentMasterSafeStatus,
      subSteps: masterSafeTransfer.transfers || [],
    };
  }, [
    isLoadingMasterSafe,
    isErrorMasterSafe,
    isSafeCreated,
    masterSafeTransfer,
    isTransferCompleted,
  ]);

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
        <EstimatedCompletionTime
          isLoading={isTimeRemainingLoading}
          time={timeRemaining}
        />
        {!!bridgeDetails && (
          <BridgingSteps
            chainName="Base"
            bridge={bridgeDetails}
            masterSafeCreation={masterSafeCreationDetails}
            masterSafeTransfer={masterSafeTransferDetails}
          />
        )}
      </CardFlex>
    </>
  );
};
