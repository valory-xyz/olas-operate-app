import { useMutation, useQuery } from '@tanstack/react-query';
import { Typography } from 'antd';
import { useEffect, useMemo } from 'react';

import { CustomAlert } from '@/components/Alert';
import { BridgeTransferFlow } from '@/components/bridge/BridgeTransferFlow';
import { BridgingSteps } from '@/components/bridge/BridgingSteps';
import { CardFlex } from '@/components/styled/CardFlex';
import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { Pages } from '@/enums/Pages';
import { TokenSymbol } from '@/enums/Token';
import { useBackupSigner } from '@/hooks/useBackupSigner';
import { useOnlineStatusContext } from '@/hooks/useOnlineStatus';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { BridgeService } from '@/service/Bridge';
import { WalletService } from '@/service/Wallet';
import { Address } from '@/types/Address';
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

// TODO: quote_bundle_id to be passed from previous screen
const useQuoteBundleId = () => 'qb-bdaafd7f-0698-4e10-83dd-d742cc0e656d';

// TODO: to be returned from the previous screen
const useSymbols = () => [TokenSymbol.OLAS, TokenSymbol.ETH];

// hook to fetch bridging steps (step 1)
const useBridgingSteps = (quoteId: string) => {
  const { isOnline } = useOnlineStatusContext();
  const symbols = useSymbols();

  // Execute bridge API to be called before fetching the status
  const { data: bridgeExecute } = useQuery({
    queryKey: REACT_QUERY_KEYS.BRIDGE_EXECUTE_KEY(quoteId),
    queryFn: async () => {
      return await BridgeService.executeBridge(quoteId);
    },
    enabled: !!quoteId && isOnline,
  });

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
            if (step.status === 'QUOTE_FAILED') return 'process';
            return 'process';
          })();

          return {
            symbol: symbols[index],
            status,
            txnLink: step.explorer_link,
          };
        }),
      };
    },
    // refetch every 5 seconds until the status is finished
    refetchInterval: ({ state }) => {
      const status = state?.data?.status;
      if (status === 'FINISHED') return false;
      return FIVE_SECONDS_INTERVAL;
    },
    enabled: !!quoteId && isOnline && !!bridgeExecute,
  });
};

// TODO: to update
const useMasterSafeCreation = () => {
  const backupSignerAddress = useBackupSigner();
  const symbols = useSymbols();
  const { selectedAgentConfig } = useServices();

  const chain = selectedAgentConfig.middlewareHomeChainId;

  // TODO: to be generated
  const initialFunds: { [address: Address]: bigint } = {
    '0x0000000000000000000000000000000000000000': BigInt('1000000000000000000'),
    '0xcE11e14225575945b8E6Dc0D4F2dD4C570f79d9f': BigInt(0),
  };

  return useMutation({
    mutationFn: async () => {
      await WalletService.createSafe(chain, backupSignerAddress, initialFunds);

      return {
        isSafeCreated: true,
        txnLink: null, // to be returned from the API

        // Transfer to master safe step:
        // - To extract this into a separate hook once the backend API is updated.
        // - Currently, both creation and transfer are handled in the same API call.
        masterSafeTransferStatus: 'FINISHED',
        transfers: symbols.map((symbol) => ({
          symbol,
          status: 'finish' as BridgingStepStatus, // Transferred as part of the creation
          txnLink: null,
        })),
      };
    },
  });
};

/**
 * Bridge in progress screen.
 */
export const BridgeInProgress = () => {
  const { goto } = usePageState();
  const quoteId = useQuoteBundleId();

  const { fromChain, toChain, transfers } = useBridgeTransfers();
  const {
    isLoading: isBridging,
    isError: isBridgeError,
    data: bridge,
  } = useBridgingSteps(quoteId);
  const {
    isPending: isLoadingMasterSafeCreation,
    isError: isErrorMasterSafeCreation,
    data: masterSafeDetails,
    mutateAsync: createMasterSafe,
  } = useMasterSafeCreation();

  const isBridgingCompleted = !!(
    bridge &&
    bridge.status === 'FINISHED' &&
    !bridge.isBridgingFailed
  );

  // Create master safe after the bridging is completed
  // and if the master safe is not created yet
  useEffect(() => {
    if (!isBridgingCompleted) return;
    if (masterSafeDetails?.isSafeCreated) return;
    createMasterSafe();
  }, [isBridgingCompleted, masterSafeDetails, createMasterSafe]);

  const isSafeCreated = masterSafeDetails?.isSafeCreated;
  const isTransferCompleted =
    masterSafeDetails?.masterSafeTransferStatus === 'FINISHED';

  useEffect(() => {
    if (!isBridgingCompleted) return;
    if (!isSafeCreated) return;
    if (!isTransferCompleted) return;

    goto(Pages.Main);
  }, [isBridgingCompleted, isSafeCreated, isTransferCompleted, goto]);

  const bridgeDetails = useMemo(() => {
    const currentBridgeStatus: BridgingStepStatus = (() => {
      if (isBridgeError) return 'error';
      if (isBridging) return 'process';
      if (!bridge) return 'wait';
      if (bridge.isBridgingFailed) return 'error';
      return isBridgingCompleted ? 'finish' : 'process';
    })();

    return {
      status: currentBridgeStatus,
      subSteps: bridge?.bridgeRequestStatus || [],
    };
  }, [isBridging, isBridgeError, isBridgingCompleted, bridge]);

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

  // TODO: to update and consolidate after the API integration (move to useQuery)
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

/**
 * - Everything will be in master EOA
 * - Now, we want to transfer OLAS & token (ETH) to master safe
 *
 * For example: EOA has "100 OLAS" & "10 ETH".
 *
 * refill_requirements API says masterEoaAddress should have 2ETH, then
 *
 * initialFunds: {
 *   100OLAS
 *   8ETH: // (what EOA has minus refill_requirements EOA) ie. 10 - 2
 * }
 */
