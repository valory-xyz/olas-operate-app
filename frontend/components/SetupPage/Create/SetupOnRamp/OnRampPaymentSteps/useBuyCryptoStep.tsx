import { Button, Typography } from 'antd';
import { useCallback, useMemo } from 'react';

import { TransactionStep } from '@/components/ui/TransactionSteps';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useOnRampContext } from '@/hooks/useOnRampContext';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { delayInSeconds } from '@/utils/delay';

const { Text } = Typography;

const TransakAgreement = () => (
  <Text className="text-sm text-lighter">
    By proceeding, you agree to the Transak&nbsp;
    <a target="_blank" href="https://transak.com/terms-of-service">
      Terms and Conditions
    </a>
    &nbsp;and&nbsp;
    <a target="_blank" href="https://transak.com/privacy-policy">
      Privacy Policy
    </a>
    .
  </Text>
);

export const useBuyCryptoStep = () => {
  const { onRampWindow } = useElectronApi();
  const { masterEoa } = useMasterWalletContext();
  const {
    isBuyCryptoBtnLoading,
    usdAmountToPay,
    updateIsBuyCryptoBtnLoading,
    isTransactionSuccessfulButFundsNotReceived,
    isOnRampingStepCompleted,
  } = useOnRampContext();

  const handleBuyCrypto = useCallback(async () => {
    if (!onRampWindow?.show) return;
    if (!usdAmountToPay) return;

    onRampWindow.show(usdAmountToPay);
    await delayInSeconds(1);
    updateIsBuyCryptoBtnLoading(true);
  }, [onRampWindow, usdAmountToPay, updateIsBuyCryptoBtnLoading]);

  const cannotBuyCrypto = !masterEoa?.address || !usdAmountToPay;

  const buyCryptoStep = useMemo<TransactionStep>(() => {
    const status = (() => {
      if (isOnRampingStepCompleted) return 'finish';
      if (isTransactionSuccessfulButFundsNotReceived) return 'process';
      if (isBuyCryptoBtnLoading) return 'process';
      return 'wait';
    })();

    return {
      status,
      title: 'Buy crypto on Transak',
      subSteps: isOnRampingStepCompleted
        ? [{ description: 'Funds received by the agent.' }]
        : [
            { description: <TransakAgreement /> },
            {
              description: (
                <Button
                  loading={
                    isBuyCryptoBtnLoading ||
                    isTransactionSuccessfulButFundsNotReceived
                  }
                  disabled={cannotBuyCrypto}
                  onClick={handleBuyCrypto}
                  type="primary"
                >
                  Buy crypto
                </Button>
              ),
            },
          ],
    };
  }, [
    isOnRampingStepCompleted,
    isBuyCryptoBtnLoading,
    isTransactionSuccessfulButFundsNotReceived,
    cannotBuyCrypto,
    handleBuyCrypto,
  ]);

  return buyCryptoStep;
};
