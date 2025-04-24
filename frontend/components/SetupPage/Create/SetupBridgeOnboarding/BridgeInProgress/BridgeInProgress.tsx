import { Typography } from 'antd';
import { useEffect, useMemo } from 'react';

import { CustomAlert } from '@/components/Alert';
import { BridgeTransferFlow } from '@/components/bridge/BridgeTransferFlow';
import { BridgingSteps, StepEvent } from '@/components/bridge/BridgingSteps';
import { CardFlex } from '@/components/styled/CardFlex';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { BridgingStepStatus, CrossChainTransferDetails } from '@/types/Bridge';
import { delayInSeconds } from '@/utils/delay';

import { SetupCreateHeader } from '../../SetupCreateHeader';
import { useBridgingSteps } from './useBridgingSteps';
import { useMasterSafeCreationAndTransfer } from './useMasterSafeCreationAndTransfer';

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

const Header = () => (
  <>
    <CardFlex $noBorder $gap={20} $padding="0 24px">
      <SetupCreateHeader />
      <Title level={3} className="m-0">
        Bridging in progress
      </Title>
    </CardFlex>
    <KeepAppOpenAlert />
  </>
);

type BridgeInProgressProps = { quoteId: string } & CrossChainTransferDetails;

/**
 * Bridge in progress screen.
 */
export const BridgeInProgress = ({
  quoteId,
  fromChain,
  toChain,
  transfers,
}: BridgeInProgressProps) => {
  const { goto } = usePageState();
  const symbols = transfers.map((transfer) => transfer.toSymbol);

  const {
    isBridgeExecuteLoading,
    isBridgeExecuteError,
    refetchBridgeExecute,
    isLoading: isBridgingStatusLoading,
    isError: isBridgingStatusError,
    data: bridgeStatus,
  } = useBridgingSteps(quoteId, symbols);
  const {
    isPending: isLoadingMasterSafeCreation,
    isError: isErrorMasterSafeCreation,
    data: masterSafeDetails,
    mutateAsync: createMasterSafe,
  } = useMasterSafeCreationAndTransfer(symbols);

  const isSafeCreated = masterSafeDetails?.isSafeCreated;
  const isTransferCompleted =
    masterSafeDetails?.masterSafeTransferStatus === 'FINISHED';

  const isBridging = useMemo(() => {
    if (isBridgeExecuteLoading) return true;
    if (isBridgingStatusLoading) return true;
  }, [isBridgeExecuteLoading, isBridgingStatusLoading]);

  const isBridgingFailed = useMemo(() => {
    if (isBridgeExecuteError) return true;
    if (isBridgingStatusError) return true;
    if (bridgeStatus?.isBridgingFailed) return true;
  }, [
    isBridgeExecuteError,
    isBridgingStatusError,
    bridgeStatus?.isBridgingFailed,
  ]);

  // Create master safe after the bridging is completed
  // and if the master safe is not created yet.
  useEffect(() => {
    // if bridging is in progress or if it has failed, do not create master safe.
    if (isBridging) return;
    if (isBridgingFailed) return;
    if (!bridgeStatus?.isBridgingCompleted) return;

    // if master safe creation is in progress or if it has failed, do not create master safe.
    if (isLoadingMasterSafeCreation) return;
    if (isErrorMasterSafeCreation) return;
    if (masterSafeDetails?.isSafeCreated) return;

    window.console.log('Creating master safe after bridging is completed', {
      isBridging,
      isBridgingFailed,
      isBridgingCompleted: bridgeStatus?.isBridgingCompleted,
      isLoadingMasterSafeCreation,
      isErrorMasterSafeCreation,
      masterSafeDetails,
    });

    createMasterSafe();
  }, [
    bridgeStatus?.isBridgingCompleted,
    isBridging,
    isBridgingFailed,
    isBridgeExecuteError,
    isLoadingMasterSafeCreation,
    masterSafeDetails,
    isErrorMasterSafeCreation,
    createMasterSafe,
  ]);

  // Redirect to main page if all 3 steps are completed
  useEffect(() => {
    // if bridging is in progress or if it has failed, do not redirect.
    if (isBridging) return;
    if (isBridgingFailed) return;
    if (!bridgeStatus?.isBridgingCompleted) return;

    // if master safe creation is in progress or if it has failed, do not redirect.
    if (isLoadingMasterSafeCreation) return;
    if (!isSafeCreated) return;
    if (!isTransferCompleted) return;

    delayInSeconds(3).then(() => {
      window.console.log('Redirecting to main page');
      goto(Pages.Main);
    });
  }, [
    isBridging,
    isBridgingFailed,
    bridgeStatus?.isBridgingCompleted,
    isLoadingMasterSafeCreation,
    isSafeCreated,
    isTransferCompleted,
    goto,
  ]);

  const bridgeDetails = useMemo(() => {
    const currentBridgeStatus: BridgingStepStatus = (() => {
      if (isBridgingFailed) return 'error';
      if (isBridging) return 'process';
      if (!bridgeStatus) return 'wait';
      if (bridgeStatus.isBridgingCompleted) return 'finish';

      return 'process';
    })();

    return {
      status: currentBridgeStatus,
      subSteps: (bridgeStatus?.bridgeRequestStatus || []).map((step) => ({
        ...step,
        onRetry: refetchBridgeExecute,
        onRetryProps: { isLoading: currentBridgeStatus === 'process' },
      })) satisfies StepEvent[],
    };
  }, [isBridging, isBridgingFailed, bridgeStatus, refetchBridgeExecute]);

  const masterSafeCreationDetails = useMemo(() => {
    const currentMasterSafeCreationStatus: BridgingStepStatus = (() => {
      if (!bridgeStatus?.isBridgingCompleted) return 'wait';
      if (isErrorMasterSafeCreation) return 'error';
      if (isLoadingMasterSafeCreation) return 'process';
      if (isSafeCreated) return 'finish';
      return 'process';
    })();

    return {
      status: currentMasterSafeCreationStatus,
      subSteps: [
        {
          txnLink: null, // BE to be updated to return the txn link
          onRetry: createMasterSafe,
          onRetryProps: {
            isLoading: currentMasterSafeCreationStatus === 'process',
          },
        },
      ] satisfies StepEvent[],
    };
  }, [
    bridgeStatus?.isBridgingCompleted,
    isSafeCreated,
    isLoadingMasterSafeCreation,
    isErrorMasterSafeCreation,
    createMasterSafe,
  ]);

  const masterSafeTransferDetails = useMemo(() => {
    const currentMasterSafeStatus: BridgingStepStatus = (() => {
      if (isErrorMasterSafeCreation) return 'error';
      if (!bridgeStatus?.isBridgingCompleted || !isSafeCreated) return 'wait';
      return isTransferCompleted ? 'finish' : 'wait';
    })();

    return {
      status: currentMasterSafeStatus,
      subSteps: (masterSafeDetails?.transfers || []).map((transfer) => ({
        ...transfer,
        onRetry: createMasterSafe,
        onRetryProps: {
          isLoading: masterSafeCreationDetails.status === 'process',
        },
      })) satisfies StepEvent[],
    };
  }, [
    isErrorMasterSafeCreation,
    isSafeCreated,
    bridgeStatus?.isBridgingCompleted,
    isTransferCompleted,
    masterSafeCreationDetails,
    masterSafeDetails?.transfers,
    createMasterSafe,
  ]);

  return (
    <>
      <Header />
      <CardFlex $noBorder $gap={20} $padding="0 24px">
        <BridgeTransferFlow
          fromChain={fromChain}
          toChain={toChain}
          transfers={transfers}
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
