import { Button, Flex, Typography } from 'antd';
import { useCallback, useMemo, useState } from 'react';

import { Alert, Modal } from '@/components/ui';
import { SETUP_SCREEN } from '@/constants';
import { useFundRecoveryExecute, useFundRecoveryScan, useSetup } from '@/hooks';
import { FundRecoveryScanResponse } from '@/types/FundRecovery';

import { BackButton } from '../../ui/BackButton';
import { SetupCard } from '../../ui/SetupCard';
import { FundRecoveryResultModal } from './FundRecoveryResultModal';
import {
  aggregateChainBalances,
  FundRecoveryChainBalances,
  FundRecoveryWithdrawForm,
} from './FundRecoveryScanResults';
import { FundRecoverySeedPhrase } from './FundRecoverySeedPhrase';

const { Text } = Typography;

type WizardStep = 'seedPhrase' | 'chainBalances';

const createEmptyWords = (): string[] => Array.from({ length: 12 }, () => '');

export const FundRecovery = () => {
  const { goto } = useSetup();

  // Seed phrase state — held only in React component state, never persisted
  const [words, setWords] = useState<string[]>(createEmptyWords());
  const [destinationAddress, setDestinationAddress] = useState('');

  const [step, setStep] = useState<WizardStep>('seedPhrase');
  const [scanResult, setScanResult] = useState<FundRecoveryScanResponse | null>(
    null,
  );
  const [scanError, setScanError] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const {
    mutate: runScan,
    isPending: isScanning,
    reset: resetScan,
  } = useFundRecoveryScan();

  const {
    mutate: runExecute,
    isPending: isExecuting,
    data: executeResult,
    error: executeError,
    reset: resetExecute,
  } = useFundRecoveryExecute();

  const chainBalances = useMemo(
    () =>
      scanResult
        ? aggregateChainBalances(scanResult.balances, scanResult.gas_warning)
        : [],
    [scanResult],
  );

  const getMnemonic = useCallback(() => words.join(' ').trim(), [words]);

  const handleScan = useCallback(() => {
    setScanError(false);
    runScan(
      { mnemonic: getMnemonic() },
      {
        onSuccess: (data) => {
          setScanResult(data);
          setStep('chainBalances');
        },
        onError: () => {
          setScanError(true);
        },
      },
    );
  }, [runScan, getMnemonic]);

  const handleWithdrawClick = useCallback(() => {
    setShowConfirmation(true);
  }, []);

  const handleConfirmWithdraw = useCallback(() => {
    setShowConfirmation(false);
    setIsResultModalOpen(true);
    runExecute({
      mnemonic: getMnemonic(),
      destination_address: destinationAddress,
    });
  }, [runExecute, getMnemonic, destinationAddress]);

  const handleCancelConfirm = useCallback(() => {
    setShowConfirmation(false);
  }, []);

  const handleCloseResultModal = useCallback(() => {
    setIsResultModalOpen(false);
    resetExecute();
  }, [resetExecute]);

  const handleTryAgain = useCallback(() => {
    setIsResultModalOpen(false);
    resetExecute();
    // Re-fire execute immediately without showing confirmation again
    setIsResultModalOpen(true);
    runExecute({
      mnemonic: getMnemonic(),
      destination_address: destinationAddress,
    });
  }, [resetExecute, runExecute, getMnemonic, destinationAddress]);

  const handleBack = useCallback(() => {
    if (step === 'chainBalances') {
      setStep('seedPhrase');
      setScanResult(null);
      setDestinationAddress('');
      resetScan();
    } else {
      goto(SETUP_SCREEN.MigrateOperateFolder);
    }
  }, [step, goto, resetScan]);

  const handleWordsChange = useCallback(
    (newWords: string[]) => {
      setWords(newWords);
      // Clear scan error when user edits words
      if (scanError) setScanError(false);
    },
    [scanError],
  );

  if (step === 'chainBalances') {
    return (
      <Flex vertical gap={24} style={{ width: '100%' }}>
        <SetupCard>
          <Flex vertical style={{ padding: '24px 24px 32px' }}>
            <Flex align="center" style={{ marginBottom: 16 }}>
              <BackButton onPrev={handleBack} />
            </Flex>

            {scanResult ? (
              <FundRecoveryChainBalances chainBalances={chainBalances} />
            ) : (
              <Alert
                type="warning"
                showIcon
                message="No scan data available. Please go back and scan again."
              />
            )}
          </Flex>
        </SetupCard>

        {scanResult && (
          <SetupCard>
            <Flex vertical style={{ padding: '24px 24px 32px' }}>
              <FundRecoveryWithdrawForm
                chainBalances={chainBalances}
                destinationAddress={destinationAddress}
                isExecuting={isExecuting}
                onDestinationAddressChange={setDestinationAddress}
                onRecover={handleWithdrawClick}
              />
            </Flex>
          </SetupCard>
        )}

        <Modal
          open={showConfirmation}
          closable
          onCancel={handleCancelConfirm}
          size="small"
          title="Confirm Withdrawal"
          description={
            <Flex vertical gap={8}>
              <Text className="text-sm">
                You are about to withdraw all recoverable funds to:
              </Text>
              <Text strong className="text-sm" style={{ wordBreak: 'break-all' }}>
                {destinationAddress}
              </Text>
              <Text type="secondary" className="text-sm">
                This action is irreversible. Please verify the address is
                correct.
              </Text>
            </Flex>
          }
          action={
            <Flex vertical gap={8} style={{ width: '100%' }}>
              <Button
                type="primary"
                size="large"
                block
                onClick={handleConfirmWithdraw}
              >
                Confirm Withdrawal
              </Button>
              <Button size="large" block onClick={handleCancelConfirm}>
                Cancel
              </Button>
            </Flex>
          }
        />

        <FundRecoveryResultModal
          result={executeResult ?? null}
          error={executeError}
          open={isResultModalOpen}
          isExecuting={isExecuting}
          onTryAgain={handleTryAgain}
          onClose={handleCloseResultModal}
        />
      </Flex>
    );
  }

  return (
    <SetupCard>
      <Flex vertical style={{ padding: '24px 24px 32px' }}>
        <Flex align="center" style={{ marginBottom: 16 }}>
          <BackButton onPrev={handleBack} />
        </Flex>

        <FundRecoverySeedPhrase
          words={words}
          isScanning={isScanning}
          scanError={scanError}
          onWordsChange={handleWordsChange}
          onScan={handleScan}
        />
      </Flex>
    </SetupCard>
  );
};
