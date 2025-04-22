import { useMutation, useQuery } from '@tanstack/react-query';
import { Button, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import { AddressBalanceRecord } from '@/client';
import { CustomAlert } from '@/components/Alert';
import { BridgeTransferFlow } from '@/components/bridge/BridgeTransferFlow';
import { BridgingSteps } from '@/components/bridge/BridgingSteps';
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
const useBridgingSteps = (
  quoteId: string,
  tokenSymbols: TokenSymbol[],
  canExecuteBridge: boolean,
) => {
  const { isOnline } = useOnlineStatusContext();

  // `/execute` bridge API should be called first before fetching the status.
  const {
    isLoading: isBridgeExecuteLoading,
    isError: isBridgeExecuteError,
    data: bridgeExecute,
  } = useQuery({
    queryKey: REACT_QUERY_KEYS.BRIDGE_EXECUTE_KEY(quoteId),
    queryFn: async () => {
      return await BridgeService.executeBridge(quoteId);
    },
    enabled: !!quoteId && isOnline && canExecuteBridge,
    retry: 3,
    refetchOnWindowFocus: false,
  });

  const statusQuery = useQuery({
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
            if (step.status === 'QUOTE_FAILED') return 'process';
            return 'process';
          })();

          return {
            symbol: tokenSymbols[index],
            status,
            txnLink: step.explorer_link,
          };
        }),
      };
    },
    // fetch by interval until the status is FINISHED
    refetchInterval: ({ state }) => {
      const status = state?.data?.status;
      if (status === 'FINISHED') return false;
      return FIVE_SECONDS_INTERVAL;
    },
    enabled: !!quoteId && isOnline && !!bridgeExecute,
  });

  return {
    isBridgeExecuteLoading,
    isBridgeExecuteError,
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
            // BE does not return the txn link yet 👇🏽
            txnLink: null,
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
  const [canExecuteBridge, setCanExecuteBridge] = useState(false);

  const {
    isBridgeExecuteLoading,
    isBridgeExecuteError,
    isLoading: isBridging,
    data: bridge,
  } = useBridgingSteps(quoteId, symbols, canExecuteBridge);
  const {
    isPending: isLoadingMasterSafeCreation,
    isError: isErrorMasterSafeCreation,
    data: masterSafeDetails,
    mutateAsync: createMasterSafe,
  } = useMasterSafeCreationAndTransfer(symbols);

  const isBridgingCompleted = !!(
    bridge?.status === 'FINISHED' && !bridge?.isBridgingFailed
  );

  const isSafeCreated = masterSafeDetails?.isSafeCreated;
  const isTransferCompleted =
    masterSafeDetails?.masterSafeTransferStatus === 'FINISHED';

  // Create master safe after the bridging is completed
  // and if the master safe is not created yet
  useEffect(() => {
    if (!isBridgingCompleted) return;
    if (isLoadingMasterSafeCreation) return;
    if (isErrorMasterSafeCreation) return;
    if (masterSafeDetails?.isSafeCreated) return;
    if (!canExecuteBridge) return;

    createMasterSafe();
  }, [
    isBridgingCompleted,
    isLoadingMasterSafeCreation,
    masterSafeDetails,
    isErrorMasterSafeCreation,
    createMasterSafe,
    canExecuteBridge,
  ]);

  // Redirect to main page if all steps are completed
  useEffect(() => {
    if (!isBridgingCompleted) return;
    if (!isSafeCreated) return;
    if (!isTransferCompleted) return;

    goto(Pages.Main);
  }, [isBridgingCompleted, isSafeCreated, isTransferCompleted, goto]);

  const bridgeDetails = useMemo(() => {
    const currentBridgeStatus: BridgingStepStatus = (() => {
      if (isBridgeExecuteError) return 'error';
      if (isBridgeExecuteLoading || isBridging) return 'process';
      if (isBridging) return 'process';
      if (!bridge) return 'wait';
      if (bridge.isBridgingFailed) return 'error';
      return isBridgingCompleted ? 'finish' : 'process';
    })();

    return {
      status: currentBridgeStatus,
      subSteps: bridge?.bridgeRequestStatus || [],
    };
  }, [
    isBridging,
    isBridgeExecuteError,
    isBridgeExecuteLoading,
    isBridgingCompleted,
    bridge,
  ]);

  const masterSafeCreationDetails = useMemo(() => {
    const currentMasterSafeCreationStatus: BridgingStepStatus = (() => {
      if (isErrorMasterSafeCreation) return 'error';
      if (!isBridgingCompleted) return 'wait';
      if (isLoadingMasterSafeCreation) return 'process';
      if (isSafeCreated) return 'finish';
      return 'process';
    })();

    return {
      status: currentMasterSafeCreationStatus,
      subSteps: [{ txnLink: null }], // BE to be updated to return the txn link
    };
  }, [
    isBridgingCompleted,
    isSafeCreated,
    isLoadingMasterSafeCreation,
    isErrorMasterSafeCreation,
  ]);

  const masterSafeTransferDetails = useMemo(() => {
    const currentMasterSafeStatus: BridgingStepStatus = (() => {
      if (isErrorMasterSafeCreation) return 'error';
      if (!isBridgingCompleted || !isSafeCreated) return 'wait';
      return isTransferCompleted ? 'finish' : 'wait';
    })();

    return {
      status: currentMasterSafeStatus,
      subSteps: masterSafeDetails?.transfers || [],
    };
  }, [
    isErrorMasterSafeCreation,
    isSafeCreated,
    isBridgingCompleted,
    isTransferCompleted,
    masterSafeDetails?.transfers,
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
        <Button
          onClick={() => setCanExecuteBridge(true)}
          type="primary"
          loading={isBridging || isBridgeExecuteLoading}
        >
          Execute Bridge (For testing)
        </Button>
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
