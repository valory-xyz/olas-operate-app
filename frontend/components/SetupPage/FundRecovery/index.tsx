import { Alert, Flex } from 'antd';
import { useCallback, useState } from 'react';

import { SETUP_SCREEN } from '@/constants';
import { useFundRecoveryExecute, useFundRecoveryScan, useSetup } from '@/hooks';
import { FundRecoveryScanResponse } from '@/types/FundRecovery';

import { BackButton } from '../../ui/BackButton';
import { FundRecoveryLoadingScreen } from './FundRecoveryLoadingScreen';
import { FundRecoveryResultModal } from './FundRecoveryResultModal';
import { FundRecoveryScanResults } from './FundRecoveryScanResults';
import { FundRecoverySeedPhrase } from './FundRecoverySeedPhrase';

type WizardStep = 'seedPhrase' | 'scanResults';

const createEmptyWords = (count: number): string[] =>
  Array.from({ length: count }, () => '');

export const FundRecovery = () => {
  const { goto } = useSetup();

  // Seed phrase state — held only in React component state, never persisted
  const [wordCount, setWordCount] = useState<12 | 24>(12);
  const [words, setWords] = useState<string[]>(createEmptyWords(12));
  const [destinationAddress, setDestinationAddress] = useState('');

  const [step, setStep] = useState<WizardStep>('seedPhrase');
  const [scanResult, setScanResult] =
    useState<FundRecoveryScanResponse | null>(null);
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
    runScan(
      {
        mnemonic: getMnemonic(),
        destination_address: destinationAddress,
      },
      {
        onSuccess: (data) => {
          setScanResult(data);
          setStep('scanResults');
        },
      },
    );
  }, [runScan, getMnemonic, destinationAddress]);

  const handleRescan = useCallback(() => {
    resetScan();
    runScan(
      {
        mnemonic: getMnemonic(),
        destination_address: destinationAddress,
      },
      {
        onSuccess: (data) => {
          setScanResult(data);
        },
      },
    );
  }, [runScan, resetScan, getMnemonic, destinationAddress]);

  const handleRecover = useCallback(() => {
    runExecute(
      {
        mnemonic: getMnemonic(),
        destination_address: destinationAddress,
      },
      {
        onSuccess: () => {
          setIsResultModalOpen(true);
        },
        onError: () => {
          setIsResultModalOpen(true);
        },
      },
    );
  }, [runExecute, getMnemonic, destinationAddress]);

  const handleTryAgain = useCallback(() => {
    setIsResultModalOpen(false);
    resetExecute();
  }, [resetExecute]);

  const handleResultModalClose = useCallback(() => {
    setIsResultModalOpen(false);
  }, []);

  const handleBack = useCallback(() => {
    if (step === 'scanResults') {
      setStep('seedPhrase');
      setScanResult(null);
      resetScan();
    } else {
      goto(SETUP_SCREEN.Welcome);
    }
  }, [step, goto, resetScan]);

  const handleWordCountToggle = useCallback(() => {
    const newCount = wordCount === 12 ? 24 : 12;
    setWordCount(newCount);
    setWords(createEmptyWords(newCount));
  }, [wordCount]);

  if (isExecuting) {
    return (
      <FundRecoveryLoadingScreen message="Recovering funds, please wait..." />
    );
  }

  return (
    <Flex vertical style={{ padding: '24px 24px 32px' }}>
      <Flex align="center" style={{ marginBottom: 16 }}>
        <BackButton onPrev={handleBack} />
      </Flex>

      {step === 'seedPhrase' && (
        <FundRecoverySeedPhrase
          wordCount={wordCount}
          words={words}
          destinationAddress={destinationAddress}
          isScanning={isScanning}
          onWordsChange={setWords}
          onDestinationAddressChange={setDestinationAddress}
          onWordCountToggle={handleWordCountToggle}
          onScan={handleScan}
        />
      )}

      {step === 'scanResults' && scanResult && (
        <FundRecoveryScanResults
          scanResult={scanResult}
          isExecuting={isExecuting}
          isRescanning={isScanning}
          onRescan={handleRescan}
          onRecover={handleRecover}
        />
      )}

      {step === 'scanResults' && !scanResult && (
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
        onClose={handleResultModalClose}
        onTryAgain={handleTryAgain}
      />
    </Flex>
  );
};
