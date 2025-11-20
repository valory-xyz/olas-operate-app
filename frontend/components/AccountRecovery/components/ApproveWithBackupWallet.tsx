import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Flex, Modal, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { LoadingOutlined, SuccessOutlined } from '@/components/custom-icons';
import { Alert } from '@/components/ui';
import { CardFlex } from '@/components/ui/CardFlex';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { SetupScreen } from '@/enums';
import { useSetup } from '@/hooks';
import { RecoveryService } from '@/service/Recovery';
import { Nullable } from '@/types';
import {
  SwapOwnerTransactionResult,
  SwapSafeTransaction,
} from '@/types/Recovery';
import { asEvmChainId } from '@/utils/middlewareHelpers';

import { useAccountRecoveryContext } from '../AccountRecoveryProvider';
import { useWeb3AuthSwapOwner } from '../hooks/useWeb3AuthBackupWallet';

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

const AccountRecoveredCompleteModal = () => {
  const { goto } = useSetup();

  return (
    <Modal open footer={null} closable={false} centered>
      <Flex gap={32} vertical align="center" style={{ padding: '24px 20px' }}>
        <Flex align="center" justify="center">
          <SuccessOutlined />
        </Flex>

        <Flex
          gap={12}
          vertical
          align="center"
          justify="center"
          className="text-center"
          style={{ maxWidth: 320 }}
        >
          <Title level={4} className="m-0">
            Pearl Account Recovered!
          </Title>
          <Text className="text-neutral-tertiary">
            You can now access your Pearl account with the new password.
          </Text>
        </Flex>

        <Button
          onClick={() => goto(SetupScreen.Welcome)}
          type="primary"
          block
          size="large"
        >
          Back to Login
        </Button>
      </Flex>
    </Modal>
  );
};

const useCounts = (
  localTransactions: Array<{ status: 'pending' | 'completed' | 'failed' }>,
) =>
  useMemo(() => {
    const completedCount = localTransactions.filter(
      (tx) => tx.status === 'completed',
    ).length;
    const failedCount = localTransactions.filter(
      (tx) => tx.status === 'failed',
    ).length;
    const pendingCount = localTransactions.filter(
      (tx) => tx.status === 'pending',
    ).length;
    return {
      completedTransactionsCount: completedCount,
      failedTransactionsCount: failedCount,
      hasFailedTransactions: failedCount > 0,
      areTransactionsCompleted:
        completedCount === localTransactions.length &&
        localTransactions.length > 0,
      hasPendingTransactions: pendingCount > 0,
    };
  }, [localTransactions]);

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
  return useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: [
        REACT_QUERY_KEYS.RECOVERY_STATUS_KEY,
        REACT_QUERY_KEYS.RECOVERY_FUNDING_REQUIREMENTS_KEY,
      ],
    });
  }, [queryClient]);
};

export const ApproveWithBackupWallet = () => {
  const invalidateQueries = useInvalidateQueries();
  const { safeSwapTransactions } = useAccountRecoveryContext();
  // Track the index of the current transaction being processed
  const [currentTxnIndex, setCurrentTxnIndex] =
    useState<Nullable<number>>(null);
  const [isAccountRecovered, setIsAccountRecovered] = useState(false);
  // Local state to track transaction statuses - only updates when length changes
  const [localTransactions, setLocalTransactions] = useState<
    Array<{
      index: number;
      status: 'pending' | 'completed' | 'failed';
      error?: string;
    }>
  >([]);

  const {
    completedTransactionsCount,
    failedTransactionsCount,
    hasFailedTransactions,
    areTransactionsCompleted,
    hasPendingTransactions,
  } = useCounts(localTransactions);

  const { isPending: isCompletingRecovery, mutateAsync: completeRecovery } =
    useMutation({
      mutationFn: async () => await RecoveryService.completeRecovery(),
    });

  // Initialize local transactions when safeSwapTransactions length changes
  const transactionsLengthRef = useRef(0);
  useEffect(() => {
    if (safeSwapTransactions.length === 0) return;
    if (safeSwapTransactions.length === transactionsLengthRef.current) return;

    transactionsLengthRef.current = safeSwapTransactions.length;
    setLocalTransactions(
      safeSwapTransactions.map((_, index) => ({ index, status: 'pending' })),
    );
  }, [safeSwapTransactions]);

  /** Handle transaction result from Web3Auth modal */
  const handleTransactionResult = useCallback(
    (result: SwapOwnerTransactionResult) => {
      if (currentTxnIndex === null) return;
      setLocalTransactions((prev) =>
        prev.map((tx, idx) => {
          if (idx !== currentTxnIndex) return tx;
          return {
            ...tx,
            status: result.success ? 'completed' : 'failed',
            error: result.success ? undefined : result.error,
          };
        }),
      );

      // Move to next pending transaction if current succeeded
      if (result.success) {
        const nextPendingIndex = localTransactions.findIndex(
          (tx, idx) => idx > currentTxnIndex && tx.status === 'pending',
        );
        setCurrentTxnIndex(nextPendingIndex === -1 ? null : nextPendingIndex);
        invalidateQueries();
      }
    },
    [currentTxnIndex, localTransactions, invalidateQueries],
  );

  const { openWeb3AuthSwapOwnerModel } = useWeb3AuthSwapOwner({
    onFinish: handleTransactionResult,
  });

  /** Open modal for current or failed transaction */
  const handleOpenWallet = () => {
    // If no current transaction, find first pending
    let txIndex = currentTxnIndex;
    if (txIndex === null) {
      const firstPendingIndex = localTransactions.findIndex(
        ({ status }) => status === 'pending',
      );
      if (firstPendingIndex !== -1) {
        txIndex = firstPendingIndex;
        setCurrentTxnIndex(firstPendingIndex);
      } else {
        return;
      }
    }

    const transaction = safeSwapTransactions[txIndex];
    if (!transaction) return;

    openWeb3AuthSwapOwnerModel(getParsedTransaction(transaction));
  };

  const handleRetry = () => {
    const firstFailedIndex = localTransactions.findIndex(
      (tx) => tx.status === 'failed',
    );
    if (firstFailedIndex === -1) return;

    setCurrentTxnIndex(firstFailedIndex);
    // Reset the failed transaction to pending
    setLocalTransactions((prev) =>
      prev.map((tx, idx) =>
        idx === firstFailedIndex ? { ...tx, status: 'pending' } : tx,
      ),
    );

    const transaction = safeSwapTransactions[firstFailedIndex];
    if (!transaction) return;

    openWeb3AuthSwapOwnerModel(getParsedTransaction(transaction));
  };

  // Automatically complete recovery when all transactions are done
  useEffect(() => {
    if (!areTransactionsCompleted) return;
    completeRecovery().then(() => setIsAccountRecovered(true));
  }, [areTransactionsCompleted, completeRecovery]);

  return (
    <Flex align="center" justify="center" className="w-full mt-40">
      <CardFlex
        $gap={16}
        styles={{ body: { padding: '16px 32px 72px 32px' } }}
        style={{ width: 784 }}
      >
        <ApproveWalletDescription />
        {(!isAccountRecovered || isCompletingRecovery) && (
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
            {failedTransactionsCount > 0 && (
              <Text type="danger" style={{ marginTop: 8 }}>
                {`${failedTransactionsCount} transaction${failedTransactionsCount > 1 ? 's' : ''} failed`}
              </Text>
            )}
          </Flex>
        )}

        <Flex align="center" justify="center" gap={12} className="w-full mt-32">
          <Button
            onClick={handleOpenWallet}
            type="primary"
            size="large"
            disabled={!hasPendingTransactions || hasFailedTransactions}
          >
            {currentTxnIndex === null ? 'Start Approval' : 'Open Wallet'}
          </Button>

          {hasFailedTransactions && (
            <Button onClick={handleRetry} type="default" size="large" danger>
              Retry Failed
            </Button>
          )}
        </Flex>
      </CardFlex>

      {isAccountRecovered && <AccountRecoveredCompleteModal />}
    </Flex>
  );
};
