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
import { Nullable } from '@/types/Util';

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

const useMasterSafeTransfers = () => ({
  isLoading: false,
  isError: false,
  data: {
    status: 'CREATED',
    isTransferFailed: false,
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

/**
 * Bridge in progress screen.
 */
export const BridgeInProgress = () => {
  const { goto } = useSetup();
  const { fromChain, toChain, transfers } = useBridgeTransfers();
  const { isLoading, isError, data: bridge } = useBridgingSteps();
  const {
    isLoading: isLoadingMasterSafe,
    isError: isErrorMasterSafe,
    data: masterSafeTransfer,
  } = useMasterSafeTransfers();

  const isBridgingSuccess = false; // TODO: from the API
  const isSafeCreated = false; // TODO: from the API

  useEffect(() => {
    if (!isBridgingSuccess) return;
    if (!isSafeCreated) return;

    goto(SetupScreen.SetupCreateSafe);
  }, [isBridgingSuccess, isSafeCreated, goto]);

  // TODO: to update and consolidate after the API integration
  const bridgeDetails = useMemo(() => {
    if (isLoading || isError) return null;
    if (!bridge) return null;

    const currentBridgeStatus: BridgingStepStatus = (() => {
      if (bridge.isBridgingFailed) return 'error';
      return bridge.status === 'FINISHED' ? 'finish' : 'process';
    })() as BridgingStepStatus; // "as" to be removed when the API is updated

    return {
      status: currentBridgeStatus,
      executions: bridge.executions,
    };
  }, [isLoading, isError, bridge]);

  // TODO: to update and consolidate after the API integration
  const masterSafeCreationDetails: {
    status: BridgingStepStatus;
    txnLink: Nullable<string>;
  } = useMemo(() => {
    if (!isBridgingSuccess) return { status: 'wait', txnLink: null };
    if (isSafeCreated) return { status: 'finish', txnLink };
    return { status: 'process', txnLink };
  }, [isSafeCreated, isBridgingSuccess]);

  // TODO: to update and consolidate after the API integration
  const masterSafeTransferDetails = useMemo(() => {
    if (isLoadingMasterSafe || isErrorMasterSafe) return;
    if (!masterSafeTransfer) return;

    const currentMasterSafeStatus: BridgingStepStatus = (() => {
      if (masterSafeTransfer.isTransferFailed) return 'error';
      if (isSafeCreated) return 'process';
      return masterSafeTransfer.status === 'FINISHED' ? 'finish' : 'wait';
    })() as BridgingStepStatus; // "as" to be removed when the API is updated

    return {
      status: currentMasterSafeStatus,
      transfers: masterSafeTransfer.transfers,
    };
  }, [
    isLoadingMasterSafe,
    isErrorMasterSafe,
    isSafeCreated,
    masterSafeTransfer,
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
        <EstimatedCompletionTime />
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
