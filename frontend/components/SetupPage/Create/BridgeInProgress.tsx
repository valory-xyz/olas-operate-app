import { useQuery } from '@tanstack/react-query';
import { Typography } from 'antd';
import { useEffect, useMemo } from 'react';

import { CustomAlert } from '@/components/Alert';
import { BridgeTransferFlow } from '@/components/bridge/BridgeTransferFlow';
import { BridgingSteps } from '@/components/bridge/BridgingSteps';
import { EstimatedCompletionTime } from '@/components/bridge/EstimatedCompletionTime';
import { CardFlex } from '@/components/styled/CardFlex';
import { ONE_SECOND_INTERVAL } from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { Pages } from '@/enums/Pages';
import { TokenSymbol } from '@/enums/Token';
import { usePageState } from '@/hooks/usePageState';
import { BridgeService } from '@/service/Bridge';
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

// TODO: to remove
const txnLink =
  'https://etherscan.io/tx/0x3795206347eae1537d852bea05e36c3e76b08cefdfa2d772e24bac2e24f31db3';

// TODO: quote_bundle_id to be passed from previous screen
const useQuoteBundleId = () => {
  return 'qb-bdaafd7f-0698-4e10-83dd-d742cc0e656d';
};

// TODO: to update
const useBridgingSteps = (quoteId: string) => {
  // TODO: fetch from bridge refill API
  const symbols = [TokenSymbol.OLAS, TokenSymbol.ETH];

  return useQuery({
    queryKey: REACT_QUERY_KEYS.BRIDGE_STATUS_BY_QUOTE_ID_KEY(quoteId),
    queryFn: async () => {
      return await BridgeService.getBridgeStatus(quoteId);
    },
    select: ({ status, error, bridge_request_status }) => {
      const isBridgingFailed = status === 'FINISHED' && error;
      return {
        status,
        isBridgingFailed,
        bridgeRequestStatus: bridge_request_status.map((step, index) => {
          const status: BridgingStepStatus = (() => {
            if (step.status === 'EXECUTION_DONE') return 'finish';
            if (step.status === 'EXECUTION_FAILED') return 'error';
            if (step.status === 'QUOTE_FAILED') return 'error';
            if (step.status === 'QUOTE_DONE') return 'finish';
            if (step.status === 'EXECUTION_PENDING') return 'process';
            return 'wait';
          })();

          return {
            symbol: symbols[index],
            status,
            txnLink: step.explorer_link || null,
          };
        }),
      };
    },
  });
};

// TODO: to update
const useMasterSafeCreation = () => ({
  isLoading: false,
  isError: false,
  data: {
    isSafeCreated: false,
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
    isLoading: false,
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
  const quoteId = useQuoteBundleId();

  const { fromChain, toChain, transfers } = useBridgeTransfers();
  const { isLoading: isTimeRemainingLoading, timeRemaining } =
    useTimeRemaining();
  const {
    isLoading: isLoadingBridge,
    isError: isErrorBridge,
    data: bridge,
  } = useBridgingSteps(quoteId);
  const {
    isLoading: isLoadingMasterSafeCreation,
    isError: isErrorMasterSafeCreation,
    data: masterSafeCreation,
  } = useMasterSafeCreation();
  const {
    isLoading: isLoadingMasterSafeTransfer,
    isError: isErrorMasterSafe,
    data: masterSafeTransfer,
  } = useMasterSafeTransfers();

  const isBridgingCompleted = bridge?.status === 'FINISHED';
  const isSafeCreated = masterSafeCreation?.isSafeCreated; // TODO: from the API
  const isTransferCompleted = masterSafeTransfer.status === 'FINISHED'; // TODO: from the API

  useEffect(() => {
    if (!isBridgingCompleted) return;
    if (!isSafeCreated) return;
    if (!isTransferCompleted) return;

    goto(Pages.Main);
  }, [isBridgingCompleted, isSafeCreated, isTransferCompleted, goto]);

  const bridgeDetails = useMemo(() => {
    const currentBridgeStatus: BridgingStepStatus = (() => {
      if (isErrorBridge) return 'error';
      if (isLoadingBridge) return 'process';
      if (!bridge) return 'wait';
      if (bridge.isBridgingFailed) return 'error';
      return isBridgingCompleted ? 'finish' : 'process';
    })();

    return {
      status: currentBridgeStatus,
      subSteps: bridge?.bridgeRequestStatus || [],
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
      if (!isBridgingCompleted || !isSafeCreated) return 'wait';
      if (isLoadingMasterSafeTransfer) return 'process';
      return isTransferCompleted ? 'finish' : 'wait';
    })();

    return {
      status: currentMasterSafeStatus,
      subSteps: masterSafeTransfer.transfers || [],
    };
  }, [
    isLoadingMasterSafeTransfer,
    isErrorMasterSafe,
    isSafeCreated,
    isBridgingCompleted,
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
