import { Button, Typography } from 'antd';
import { useCallback, useMemo } from 'react';

import { TransactionStep } from '@/components/ui/TransactionSteps';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useOnRampContext } from '@/hooks/useOnRampContext';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { delayInSeconds } from '@/utils/delay';

const { Text } = Typography;

const OnRampAgreement = ({ onClick }: { onClick?: () => void }) => (
  <Text className="text-sm text-lighter">
    By proceeding, you agree to the service&apos;s&nbsp;
    <a onClick={onClick}>Terms & Conditions</a>.
  </Text>
);

export const useBuyCryptoStep = () => {
  const { onRampWindow, termsAndConditionsWindow } = useElectronApi();
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

  const openTerms = useCallback(async () => {
    termsAndConditionsWindow?.show?.('transak');
  }, [termsAndConditionsWindow]);

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
            {
              description: <OnRampAgreement onClick={openTerms} />,
            },
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
    openTerms,
  ]);

  return buyCryptoStep;
};
