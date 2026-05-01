import { Button, Flex, Typography } from 'antd';
import { useCallback, useMemo } from 'react';

import { TransactionStep } from '@/components/ui/TransactionSteps';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useOnRampContext } from '@/hooks/useOnRampContext';
import { useMasterWalletContext } from '@/hooks/useWallet';

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
    nativeAmountWithBuffer,
    usdAmountToPay,
    updateIsBuyCryptoBtnLoading,
    isTransactionSuccessfulButFundsNotReceived,
    isOnRampingStepCompleted,
    moonpayCurrencyCode,
  } = useOnRampContext();

  // nativeAmountWithBuffer is the buffered native (= agent-required + $5-worth-
  // of-native slippage cushion).
  const handleBuyCrypto = useCallback(async () => {
    if (!onRampWindow?.show) return;
    if (!nativeAmountWithBuffer) return;
    if (!usdAmountToPay) return;
    if (!moonpayCurrencyCode) return;
    if (!masterEoa?.address) return;

    const formattedAmount = nativeAmountWithBuffer.toFixed(6);
    if (Number(formattedAmount) === 0) return;

    updateIsBuyCryptoBtnLoading(true);
    onRampWindow.show(formattedAmount, moonpayCurrencyCode, masterEoa.address);
  }, [
    onRampWindow,
    nativeAmountWithBuffer,
    usdAmountToPay,
    moonpayCurrencyCode,
    masterEoa,
    updateIsBuyCryptoBtnLoading,
  ]);

  const cannotBuyCrypto =
    !masterEoa?.address || !nativeAmountWithBuffer || !usdAmountToPay;

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
