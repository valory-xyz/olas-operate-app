import { useMutation, useQuery } from '@tanstack/react-query';
import { Typography } from 'antd';
import { useEffect, useMemo } from 'react';

import { CustomAlert } from '@/components/Alert';
import { BridgeTransferFlow } from '@/components/bridge/BridgeTransferFlow';
import { BridgingSteps } from '@/components/bridge/BridgingSteps';
import { CardFlex } from '@/components/styled/CardFlex';
import { AddressZero } from '@/constants/address';
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

const useMasterSafeCreation = () => {
  const backupSignerAddress = useBackupSigner();
  const symbols = useSymbols();
  const { masterEoa } = useMasterWalletContext();
  const { balances, isBalancesAndFundingRequirementsLoading } =
    useBalanceAndRefillRequirementsContext();
  const { selectedAgentConfig } = useServices();

  const chain = selectedAgentConfig.middlewareHomeChainId;

  const initialFunds = useMemo(() => {
    if (isBalancesAndFundingRequirementsLoading) return;
    if (!balances) return;
    if (!masterEoa) return;

    const eoaFunds = { ...balances[masterEoa.address] };
    const fundRequiredByEoa = 50; // Doubt: where is this in refill_requirements? 🥲

    // Keep some funds in the EOA for gas and transfer the rest to the master safe.
    const nativeFundsForMasterSafe = eoaFunds[AddressZero] - fundRequiredByEoa;
    eoaFunds[AddressZero] = Math.max(nativeFundsForMasterSafe, 0);

    return eoaFunds;
  }, [isBalancesAndFundingRequirementsLoading, balances, masterEoa]);

  return useMutation({
    mutationFn: async () => {
      if (!initialFunds) return;

      await WalletService.createSafe(chain, backupSignerAddress, initialFunds);

      return {
        isSafeCreated: true,
        txnLink: null, // BE does not return the txn link yet

        // NOTE: Currently, both creation and transfer are handled in the same API call.
        masterSafeTransferStatus: 'FINISHED',
        transfers: symbols.map((symbol) => ({
          symbol,
          status: 'finish' as BridgingStepStatus, // Transferred as part of the creation, hence finish
          txnLink: null, // BE does not return the txn link yet
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
    if (masterSafeDetails?.isSafeCreated) return;

    createMasterSafe();
  }, [
    isBridgingCompleted,
    isLoadingMasterSafeCreation,
    masterSafeDetails,
    createMasterSafe,
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
