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
      to 10 minutes to be available.
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
    networkName,
    cryptoCurrencyCode,
  } = useOnRampContext();

  const handleBuyCrypto = useCallback(async () => {
    if (!onRampWindow?.show) return;
    if (!usdAmountToPay) return;
    if (!networkName) return;
    if (!cryptoCurrencyCode) return;

    onRampWindow.show(usdAmountToPay, networkName, cryptoCurrencyCode);
    await delayInSeconds(1);
    updateIsBuyCryptoBtnLoading(true);
  }, [
    onRampWindow,
    usdAmountToPay,
    networkName,
    cryptoCurrencyCode,
    updateIsBuyCryptoBtnLoading,
  ]);

  const cannotBuyCrypto = !masterEoa?.address || !usdAmountToPay;

  const openTerms = useCallback(async () => {
    termsAndConditionsWindow?.show?.('transak-terms');
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
