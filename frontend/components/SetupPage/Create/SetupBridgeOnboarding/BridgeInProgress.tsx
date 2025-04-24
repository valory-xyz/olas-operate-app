import { useMutation, useQuery } from '@tanstack/react-query';
import { Typography } from 'antd';
import { useEffect, useMemo } from 'react';

import { AddressBalanceRecord } from '@/client';
import { CustomAlert } from '@/components/Alert';
import { BridgeTransferFlow } from '@/components/bridge/BridgeTransferFlow';
import { BridgingSteps, StepEvent } from '@/components/bridge/BridgingSteps';
import { CardFlex } from '@/components/styled/CardFlex';
import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { Pages } from '@/enums/Pages';
import { TokenSymbol } from '@/enums/Token';
import { useBackupSigner } from '@/hooks/useBackupSigner';
import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';
import { useOnlineStatusContext } from '@/hooks/useOnlineStatus';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { BridgeService } from '@/service/Bridge';
import { WalletService } from '@/service/Wallet';
import { Address } from '@/types/Address';
import { BridgingStepStatus, CrossChainTransferDetails } from '@/types/Bridge';
import { bigintMax } from '@/utils/calculations';

import { SetupCreateHeader } from '../SetupCreateHeader';

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

// hook to fetch bridging steps (step 1)
const useBridgingSteps = (quoteId: string, tokenSymbols: TokenSymbol[]) => {
  const { isOnline } = useOnlineStatusContext();

  // `/execute` bridge API should be called first before fetching the status.
  const {
    isLoading: isBridgeExecuteLoading,
    isFetching: isBridgeExecuteFetching,
    isError: isBridgeExecuteError,
    refetch: refetchBridgeExecute,
    data: bridgeExecuteDetails,
  } = useQuery({
    queryKey: REACT_QUERY_KEYS.BRIDGE_EXECUTE_KEY(quoteId),
    queryFn: async () => {
      try {
        return await BridgeService.executeBridge(quoteId);
      } catch (error) {
        console.error('Error executing bridge', error);
        throw error;
      }
    },
    enabled: !!quoteId && isOnline,
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  const statusQuery = useQuery({
    queryKey: REACT_QUERY_KEYS.BRIDGE_STATUS_BY_QUOTE_ID_KEY(quoteId),
    queryFn: async () => {
      try {
        return await BridgeService.getBridgeStatus(quoteId);
      } catch (error) {
        console.error('Error fetching bridge status', error);
        throw error;
      }
    },
    select: ({ status, bridge_request_status }) => {
      const isBridgingFailed = bridge_request_status.some(
        (step) => step.status === 'EXECUTION_FAILED',
      );
      const isBridgingCompleted = bridge_request_status.every(
        (step) => step.status === 'EXECUTION_DONE',
      );
      return {
        status,
        isBridgingCompleted,
        isBridgingFailed,
        bridgeRequestStatus: bridge_request_status.map((step, index) => {
          const status: BridgingStepStatus = (() => {
            if (step.status === 'EXECUTION_DONE') return 'finish';
            if (step.status === 'EXECUTION_FAILED') return 'error';
            if (step.status === 'EXECUTION_PENDING') return 'process';
            return 'process';
          })();

          return {
            symbol: tokenSymbols[index],
            status,
            txnLink: step.explorer_link,
          };
        }) satisfies StepEvent[],
      };
    },
    // fetch by interval until the status is FINISHED
    refetchInterval: ({ state }) => {
      const isBridgingFailed = state?.data?.bridge_request_status.some(
        (step) => step.status === 'EXECUTION_FAILED',
      );
      const isBridgingCompleted = state?.data?.bridge_request_status.every(
        (step) => step.status === 'EXECUTION_DONE',
      );

      return isBridgingFailed || isBridgingCompleted
        ? false
        : FIVE_SECONDS_INTERVAL;
    },
    enabled: !!quoteId && isOnline && !!bridgeExecuteDetails,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    isBridgeExecuteLoading: isBridgeExecuteFetching || isBridgeExecuteLoading,
    isBridgeExecuteError,
    refetchBridgeExecute,
    ...statusQuery,
  };
};

// hook to create master safe and transfer funds (step 2 and 3)
const useMasterSafeCreationAndTransfer = (tokenSymbols: TokenSymbol[]) => {
  const backupSignerAddress = useBackupSigner();
  const { masterEoa } = useMasterWalletContext();
  const {
    isBalancesAndFundingRequirementsLoading,
    balances,
    refillRequirements,
  } = useBalanceAndRefillRequirementsContext();
  const { selectedAgentConfig } = useServices();

  const chain = selectedAgentConfig.middlewareHomeChainId;

  const initialFunds = useMemo(() => {
    if (isBalancesAndFundingRequirementsLoading) return;
    if (!balances) return;
    if (!masterEoa) return;

    return Object.entries(balances[masterEoa.address]).reduce(
      (acc, [tokenAddress, tokenBalance]) => {
        /** @example { [0xMasterEoaAddress]: { 0x00000000...: amount } } */
        const requiredAmountsByMasterEoa = (
          refillRequirements as AddressBalanceRecord
        )?.[masterEoa.address];

        if (!requiredAmountsByMasterEoa) return acc;

        const amountRequiredByMasterEoaCurrentToken =
          requiredAmountsByMasterEoa[tokenAddress as Address] || 0;

        // NOTE: Need to keep some funds in the EOA for gas, and transfer the rest to the master safe.
        const remainingBalanceForMasterSafe = bigintMax(
          BigInt(tokenBalance) - BigInt(amountRequiredByMasterEoaCurrentToken),
        );
        acc[tokenAddress as Address] = remainingBalanceForMasterSafe.toString();

        return acc;
      },
      {} as Record<Address, string>,
    );
  }, [
    isBalancesAndFundingRequirementsLoading,
    masterEoa,
    balances,
    refillRequirements,
  ]);

  return useMutation({
    mutationFn: async () => {
      if (!initialFunds) return;

      try {
        const response = await WalletService.createSafe(
          chain,
          backupSignerAddress,
          initialFunds,
        );

        return {
          isSafeCreated: true,
          txnLink: response.safe_creation_explorer_link || null,

          // NOTE: Currently, both creation and transfer are handled in the same API call.
          // Hence, the response contains the transfer status as well.
          masterSafeTransferStatus: 'FINISHED',
          transfers: tokenSymbols.map((symbol) => ({
            symbol,
            status: 'finish' as BridgingStepStatus,
            txnLink: null, // BE does not return the txn link yet
          })),
        };
      } catch (error) {
        console.error('Safe creation failed:', error);
        throw error;
      }
    },
  });
};

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
    data: bridge,
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
    if (bridge?.isBridgingFailed) return true;
  }, [isBridgeExecuteError, isBridgingStatusError, bridge?.isBridgingFailed]);

  // Create master safe after the bridging is completed
  // and if the master safe is not created yet
  useEffect(() => {
    if (isBridging) return;
    if (isBridgingFailed) return;

    // if master safe creation is still loading or if it has failed
    if (isLoadingMasterSafeCreation) return;
    if (isErrorMasterSafeCreation) return;
    if (masterSafeDetails?.isSafeCreated) return;

    createMasterSafe();
  }, [
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
    if (isBridging) return;
    if (isBridgingFailed) return;
    if (!bridge?.isBridgingCompleted) return;
    if (!isSafeCreated) return;
    if (!isTransferCompleted) return;

    goto(Pages.Main);
  }, [
    isBridging,
    isBridgingFailed,
    bridge?.isBridgingCompleted,
    isSafeCreated,
    isTransferCompleted,
    goto,
  ]);

  const bridgeDetails = useMemo(() => {
    const currentBridgeStatus: BridgingStepStatus = (() => {
      if (isBridgingFailed) return 'error';
      if (isBridging) return 'process';
      if (!bridge) return 'wait';
      if (bridge.isBridgingCompleted) return 'finish';

      return 'process';
    })();

    return {
      status: currentBridgeStatus,
      subSteps: (bridge?.bridgeRequestStatus || []).map((step) => ({
        ...step,
        onRetry: refetchBridgeExecute,
        onRetryProps: { isLoading: currentBridgeStatus === 'process' },
      })) satisfies StepEvent[],
    };
  }, [isBridging, isBridgingFailed, bridge, refetchBridgeExecute]);

  const masterSafeCreationDetails = useMemo(() => {
    const currentMasterSafeCreationStatus: BridgingStepStatus = (() => {
      if (!bridge?.isBridgingCompleted) return 'wait';
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
    bridge?.isBridgingCompleted,
    isSafeCreated,
    isLoadingMasterSafeCreation,
    isErrorMasterSafeCreation,
    createMasterSafe,
  ]);

  const masterSafeTransferDetails = useMemo(() => {
    const currentMasterSafeStatus: BridgingStepStatus = (() => {
      if (isErrorMasterSafeCreation) return 'error';
      if (!bridge?.isBridgingCompleted || !isSafeCreated) return 'wait';
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
    bridge?.isBridgingCompleted,
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
