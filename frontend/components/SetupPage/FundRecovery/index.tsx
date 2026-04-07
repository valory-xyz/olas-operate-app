import { Flex } from 'antd';
import { useCallback, useState } from 'react';

import { Alert } from '@/components/ui';
import { SETUP_SCREEN } from '@/constants';
import { useFundRecoveryExecute, useFundRecoveryScan, useSetup } from '@/hooks';
import { FundRecoveryScanResponse } from '@/types/FundRecovery';

import { BackButton } from '../../ui/BackButton';
import { SetupCard } from '../../ui/SetupCard';
import { FundRecoveryResultModal } from './FundRecoveryResultModal';
import {
  FundRecoveryChainBalances,
  FundRecoveryWithdrawForm,
} from './FundRecoveryScanResults';
import { FundRecoverySeedPhrase } from './FundRecoverySeedPhrase';

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

  const handleRecover = useCallback(() => {
    setIsResultModalOpen(true);
    runExecute({
      mnemonic: getMnemonic(),
      destination: destinationAddress,
    });
  }, [runExecute, getMnemonic, destinationAddress]);

  const handleCloseResultModal = useCallback(() => {
    setIsResultModalOpen(false);
    resetExecute();
  }, [resetExecute]);

  const handleTryAgain = useCallback(() => {
    setIsResultModalOpen(false);
    resetExecute();
    // Re-fire execute immediately
    handleRecover();
  }, [resetExecute, handleRecover]);

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
              <FundRecoveryChainBalances scanResult={scanResult} />
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
                scanResult={scanResult}
                destinationAddress={destinationAddress}
                isExecuting={isExecuting}
                onDestinationAddressChange={setDestinationAddress}
                onRecover={handleRecover}
              />
            </Flex>
          </SetupCard>
        )}

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

        <FundRecoveryResultModal
          result={executeResult ?? null}
          error={executeError}
          open={isResultModalOpen}
          isExecuting={isExecuting}
          onTryAgain={handleTryAgain}
          onClose={handleCloseResultModal}
        />
      </Flex>
    </SetupCard>
  );
};
