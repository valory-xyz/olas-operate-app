import { Button, Flex, Typography } from 'antd';
import { useCallback, useMemo } from 'react';

import { TransactionStep } from '@/components/ui/TransactionSteps';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useOnRampContext } from '@/hooks/useOnRampContext';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { delayInSeconds } from '@/utils/delay';

const { Text } = Typography;

const OnRampAgreement = ({ onClick }: { onClick?: () => void }) => (
  <Flex vertical gap={8}>
    <Text className="text-sm text-neutral-tertiary">
      Once your card payment has been successfully initiated, funds may take up
      to 30 minutes to be available.
    </Text>
    <Text className="text-sm text-neutral-tertiary">
      By proceeding, you agree to the service&apos;s&nbsp;
      <a onClick={onClick}>Terms & Conditions</a>.
    </Text>
  </Flex>
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
    moonpayCurrencyCode,
  } = useOnRampContext();

  const handleBuyCrypto = useCallback(async () => {
    if (!onRampWindow?.show) return;
    if (!usdAmountToPay) return;
    if (!moonpayCurrencyCode) return;

    // TODO Phase 3: onRampWindow.show signature drops networkName; pass
    // (nativeAmountToPay.toFixed(6), moonpayCurrencyCode) once Electron
    // preload + main are updated.
    onRampWindow.show(usdAmountToPay, '', moonpayCurrencyCode);
    await delayInSeconds(1);
    updateIsBuyCryptoBtnLoading(true);
  }, [
    onRampWindow,
    usdAmountToPay,
    moonpayCurrencyCode,
    updateIsBuyCryptoBtnLoading,
  ]);

  const cannotBuyCrypto = !masterEoa?.address || !usdAmountToPay;

  const openTerms = useCallback(async () => {
    termsAndConditionsWindow?.show?.('moonpay-terms');
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
      title: 'Buy crypto on MoonPay',
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
