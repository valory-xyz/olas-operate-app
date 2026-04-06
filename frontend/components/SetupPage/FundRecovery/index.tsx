import { Alert, Flex } from 'antd';
import { useCallback, useState } from 'react';

import { SETUP_SCREEN } from '@/constants';
import { useFundRecoveryExecute, useFundRecoveryScan, useSetup } from '@/hooks';
import { FundRecoveryScanResponse } from '@/types/FundRecovery';

import { BackButton } from '../../ui/BackButton';
import { FundRecoveryResultModal } from './FundRecoveryResultModal';
import { FundRecoveryScanResults } from './FundRecoveryScanResults';
import { FundRecoverySeedPhrase } from './FundRecoverySeedPhrase';

type WizardStep = 'seedPhrase' | 'chainBalances';

const createEmptyWords = (): string[] => Array.from({ length: 12 }, () => '');

export const FundRecovery = () => {
  const { goto } = useSetup();

  // Seed phrase state — held only in React component state, never persisted
  const [words, setWords] = useState<string[]>(createEmptyWords());
  const [destinationAddress, setDestinationAddress] = useState('');

  const [step, setStep] = useState<WizardStep>('seedPhrase');
  const [scanResult, setScanResult] =
    useState<FundRecoveryScanResponse | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);

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

  const getMnemonic = useCallback(() => words.join(' ').trim(), [words]);

  const handleScan = useCallback(() => {
    setScanError(null);
    runScan(
      { mnemonic: getMnemonic() },
      {
        onSuccess: (data) => {
          setScanResult(data);
          setStep('chainBalances');
        },
        onError: (err) => {
          setScanError(
            err instanceof Error
              ? err.message
              : 'Invalid recovery phrase. Please check your words and try again.',
          );
        },
      },
    );
  }, [runScan, getMnemonic]);

  const handleRecover = useCallback(() => {
    setIsResultModalOpen(true);
    runExecute(
      {
        mnemonic: getMnemonic(),
        destination_address: destinationAddress,
      },
      {
        onSuccess: () => {
          // modal is already open; isExecuting will become false, revealing the success variant
        },
        onError: () => {
          // modal is already open; isExecuting will become false, revealing the failed variant
        },
      },
    );
  }, [runExecute, getMnemonic, destinationAddress]);

  const handleTryAgain = useCallback(() => {
    setIsResultModalOpen(false);
    resetExecute();
    // Go back to seed phrase so user can re-enter and re-scan
    setStep('seedPhrase');
    setScanResult(null);
    resetScan();
  }, [resetExecute, resetScan]);

  const handleBack = useCallback(() => {
    if (step === 'chainBalances') {
      setStep('seedPhrase');
      setScanResult(null);
      resetScan();
    } else {
      goto(SETUP_SCREEN.MigrateOperateFolder);
    }
  }, [step, goto, resetScan]);

  const handleWordsChange = useCallback(
    (newWords: string[]) => {
      setWords(newWords);
      // Clear scan error when user edits words
      if (scanError) setScanError(null);
    },
    [scanError],
  );

  return (
    <Flex vertical style={{ padding: '24px 24px 32px' }}>
      <Flex align="center" style={{ marginBottom: 16 }}>
        <BackButton onPrev={handleBack} />
      </Flex>

      {step === 'seedPhrase' && (
        <FundRecoverySeedPhrase
          words={words}
          isScanning={isScanning}
          scanError={scanError}
          onWordsChange={handleWordsChange}
          onScan={handleScan}
        />
      )}

      {step === 'chainBalances' && scanResult && (
        <FundRecoveryScanResults
          scanResult={scanResult}
          destinationAddress={destinationAddress}
          isExecuting={isExecuting}
          onDestinationAddressChange={setDestinationAddress}
          onRecover={handleRecover}
        />
      )}

      {step === 'chainBalances' && !scanResult && (
        <Alert
          type="warning"
          showIcon
          message="No scan data available. Please go back and scan again."
        />
      )}

      <FundRecoveryResultModal
        result={executeResult ?? null}
        error={executeError}
        open={isResultModalOpen}
        isExecuting={isExecuting}
        onTryAgain={handleTryAgain}
      />
    </Flex>
  );
};
