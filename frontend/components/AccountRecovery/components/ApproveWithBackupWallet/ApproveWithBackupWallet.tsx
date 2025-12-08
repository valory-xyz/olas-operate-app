import { ReloadOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Flex, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { LoadingOutlined } from '@/components/custom-icons';
import { Alert } from '@/components/ui';
import { CardFlex } from '@/components/ui/CardFlex';
import { REACT_QUERY_KEYS } from '@/constants';
import { useMessageApi } from '@/context/MessageProvider';
import { RecoveryService } from '@/service/Recovery';
import { Nullable } from '@/types';
import {
  SwapOwnerTransactionFailure,
  SwapOwnerTransactionSuccess,
  SwapSafeTransaction,
} from '@/types/Recovery';
import { delayInSeconds } from '@/utils';
import { asEvmChainId } from '@/utils/middlewareHelpers';

import { useAccountRecoveryContext } from '../../AccountRecoveryProvider';
import { useWeb3AuthSwapOwner } from '../../hooks/useWeb3AuthSwapOwner';
import { AccountRecoveredCompleteModal } from './AccountRecoveredCompleteModal';

const { Title, Text } = Typography;

const ApproveWalletDescription = () => (
  <>
    <Flex vertical gap={12}>
      <Title level={3} className="m-0">
        Approve with Your Backup Wallet
      </Title>
      <Text className="text-neutral-secondary">
        A sign-in window from your wallet provider will open here. Review and
        approve each pending transaction, and keep this window open.
      </Text>
    </Flex>

    <Alert
      type="warning"
      showIcon
      message="Don’t close this window until all transactions are approved. If you leave before finishing, you’ll need to complete the approvals later in your backup wallet outside Pearl."
    />
  </>
);

const useTxnsCount = (
  localTransactions: Array<{ status: SwapSafeTransaction['status'] }>,
) => {
  const getCount = useCallback(
    (type: SwapSafeTransaction['status']) =>
      localTransactions.filter((tx) => tx.status === type).length,
    [localTransactions],
  );

  return useMemo(() => {
    return {
      completedTransactionsCount: getCount('completed'),
      failedTransactionsCount: getCount('failed'),
      hasFailedTransactions: getCount('failed') > 0,
      areTransactionsCompleted:
        getCount('completed') === localTransactions.length &&
        localTransactions.length > 0,
      hasPendingTransactions: getCount('pending') > 0,
    };
  }, [localTransactions, getCount]);
};

const getParsedTransaction = (transaction: SwapSafeTransaction) => ({
  safeAddress: transaction.safeAddress,
  oldOwnerAddress: transaction.oldMasterEoaAddress,
  newOwnerAddress: transaction.newMasterEoaAddress,
  backupOwnerAddress: transaction.signerAddress,
  chainId: asEvmChainId(transaction.chain),
});

/**
 * Invalidate relevant queries after transaction completion,
 * ie. to refresh recovery status and funding requirements
 */
const useInvalidateQueries = () => {
  const queryClient = useQueryClient();
  return useCallback(
    async (refetchStatus = false) => {
      if (refetchStatus) {
        await queryClient.invalidateQueries({
          queryKey: REACT_QUERY_KEYS.RECOVERY_STATUS_KEY,
        });
      }

      await queryClient.invalidateQueries({
        queryKey: REACT_QUERY_KEYS.RECOVERY_FUNDING_REQUIREMENTS_KEY,
      });
    },
    [queryClient],
  );
};

const makeTxnId = (txn: SwapSafeTransaction) =>
  `${txn.chain}-${txn.safeAddress}-${txn.newMasterEoaAddress}`;

type LocalTransaction = {
  id: string;
  status: 'pending' | 'completed' | 'failed';
  error?: string;
};

export const ApproveWithBackupWallet = () => {
  const message = useMessageApi();
  const invalidateQueries = useInvalidateQueries();
  const { safeSwapTransactions } = useAccountRecoveryContext();
  // track current transaction by stable id instead of array index
  const [currentTxnId, setCurrentTxnId] = useState<Nullable<string>>(null);
  // Ref to keep track of current transaction id in callbacks
  const currentTxnIdRef = useRef<Nullable<string>>(null);
  const [isAccountRecovered, setIsAccountRecovered] = useState(false);
  const [isButtonLoading, setIsButtonLoading] = useState(false);

  // Local state to track transaction statuses by id
  const [localTransactions, setLocalTransactions] = useState<
    Array<LocalTransaction>
  >([]);

  // Keep ref in sync with state
  useEffect(() => {
    currentTxnIdRef.current = currentTxnId;
  }, [currentTxnId]);

  const setCurrentTxnIdSafe = useCallback((id: Nullable<string>) => {
    currentTxnIdRef.current = id;
    setCurrentTxnId(id);
  }, []);

  const {
    completedTransactionsCount,
    hasFailedTransactions,
    areTransactionsCompleted,
    hasPendingTransactions,
  } = useTxnsCount(localTransactions);

  const { mutateAsync: completeRecovery } = useMutation({
    mutationFn: async () => await RecoveryService.completeRecovery(),
  });

  // Initialize local transactions when safeSwapTransactions length changes
  const transactionsLengthRef = useRef(0);

  useEffect(() => {
    if (safeSwapTransactions.length === 0) return;
    if (safeSwapTransactions.length === transactionsLengthRef.current) return;

    transactionsLengthRef.current = safeSwapTransactions.length;
    setLocalTransactions((prev) => {
      const prevById = new Map(prev.map((p) => [p.id, p]));
      return safeSwapTransactions.map((tx) => {
        const id = makeTxnId(tx);
        const existing = prevById.get(id);
        return existing
          ? { ...existing }
          : { id, status: tx.status ?? 'pending' };
      });
    });
  }, [safeSwapTransactions]);

  const handleClose = useCallback(() => setIsButtonLoading(false), []);

  /** Handle transaction result from Web3Auth modal */
  const handleTransactionResult = useCallback(
    async (
      result: SwapOwnerTransactionSuccess | SwapOwnerTransactionFailure,
    ) => {
      setIsButtonLoading(false);

      const activeId = currentTxnIdRef.current;
      if (!activeId) return;

      const updated = await new Promise<LocalTransaction[]>((resolve) => {
        setLocalTransactions((prev) => {
          const updated = prev.map((tx) => {
            if (tx.id !== activeId) return tx;
            const status: SwapSafeTransaction['status'] = result.success
              ? 'completed'
              : 'failed';
            const error = 'error' in result ? result.error : undefined;
            return { ...tx, status, error };
          });
          resolve(updated);
          return updated;
        });
      });

      if (result.success) {
        const currentIdx = updated.findIndex((t) => t.id === activeId);
        const nextPending = updated
          .slice(currentIdx + 1)
          .find((t) => t.status === 'pending');
        setCurrentTxnIdSafe(nextPending ? nextPending.id : null);
        await delayInSeconds(5);
        await invalidateQueries();
      }
    },
    [invalidateQueries, setCurrentTxnIdSafe],
  );

  const { openWeb3AuthSwapOwnerModel } = useWeb3AuthSwapOwner({
    onFinish: handleTransactionResult,
    onClose: handleClose,
  });

  /** Open modal for current or failed transaction */
  const handleOpenWallet = useCallback(() => {
    setIsButtonLoading(true);

    // Determine transaction id to open
    let txId = currentTxnId;
    if (!txId) {
      const firstPending = localTransactions.find(
        ({ status }) => status === 'pending',
      );
      if (firstPending) {
        txId = firstPending.id;
        setCurrentTxnIdSafe(firstPending.id);
      } else {
        setIsButtonLoading(false);
        return;
      }
    }

    const txIndex = safeSwapTransactions.findIndex(
      (t) => makeTxnId(t) === txId,
    );
    if (txIndex === -1) {
      setIsButtonLoading(false);
      return;
    }

    const transaction = safeSwapTransactions[txIndex];
    openWeb3AuthSwapOwnerModel(getParsedTransaction(transaction));
  }, [
    currentTxnId,
    localTransactions,
    safeSwapTransactions,
    openWeb3AuthSwapOwnerModel,
    setCurrentTxnIdSafe,
  ]);

  const handleRetry = useCallback(() => {
    setIsButtonLoading(true);
    const firstFailed = localTransactions.find((tx) => tx.status === 'failed');
    if (!firstFailed) {
      setIsButtonLoading(false);
      return;
    }

    setCurrentTxnIdSafe(firstFailed.id);
    // Reset the failed transaction to pending
    setLocalTransactions((prev) =>
      prev.map((tx) =>
        tx.id === firstFailed.id ? { ...tx, status: 'pending' } : tx,
      ),
    );

    const txIndex = safeSwapTransactions.findIndex(
      (t) => makeTxnId(t) === firstFailed.id,
    );
    if (txIndex === -1) {
      setIsButtonLoading(false);
      return;
    }

    openWeb3AuthSwapOwnerModel(
      getParsedTransaction(safeSwapTransactions[txIndex]),
    );
  }, [
    localTransactions,
    safeSwapTransactions,
    openWeb3AuthSwapOwnerModel,
    setCurrentTxnIdSafe,
  ]);

  // Automatically complete recovery when all transactions are done
  useEffect(() => {
    if (!areTransactionsCompleted) return;

    delayInSeconds(15)
      .then(() => completeRecovery())
      .then(() => invalidateQueries(true))
      .then(() => setIsAccountRecovered(true))
      .catch((error) => {
        message.error('Failed to complete recovery. Please try again.');
        console.error('Recovery completion error:', error);
      });
  }, [areTransactionsCompleted, completeRecovery, invalidateQueries, message]);

  const btnText = useMemo(() => {
    if (areTransactionsCompleted) return 'Recovering...';
    return currentTxnId === null ? 'Start Approval' : 'Open Wallet';
  }, [areTransactionsCompleted, currentTxnId]);

  return (
    <Flex align="center" justify="center" className="w-full mt-40">
      <CardFlex
        $gap={16}
        styles={{ body: { padding: '16px 32px 72px 32px' } }}
        style={{ width: 784 }}
      >
        <ApproveWalletDescription />
        {!isAccountRecovered && (
          <Flex
            vertical
            align="center"
            justify="center"
            gap={16}
            style={{ marginTop: 56 }}
          >
            <LoadingOutlined />
            <Text className="text-neutral-tertiary">
              {`${completedTransactionsCount} transactions out of ${localTransactions.length}`}
            </Text>
          </Flex>
        )}

        <Flex align="center" justify="center" gap={12} className="w-full mt-32">
          {hasFailedTransactions ? (
            <Button
              loading={isButtonLoading}
              onClick={handleRetry}
              type="default"
              size="large"
              danger
              icon={<ReloadOutlined />}
            >
              Retry Failed
            </Button>
          ) : (
            <Button
              onClick={handleOpenWallet}
              type="primary"
              size="large"
              disabled={!hasPendingTransactions}
              loading={isButtonLoading}
            >
              {btnText}
            </Button>
          )}
        </Flex>
      </CardFlex>

      {isAccountRecovered && <AccountRecoveredCompleteModal />}
    </Flex>
  );
};
