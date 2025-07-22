import { Button } from 'antd';
import { useCallback, useMemo } from 'react';

import { TransactionStep } from '@/components/ui/TransactionSteps';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useOnRampContext } from '@/hooks/useOnRampContext';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { delayInSeconds } from '@/utils/delay';

const FOLLOW_INSTRUCTIONS_MESSAGE =
  'Follow the instructions to fund your agent for the preferred fiat currency. Pearl will handle the rest.';

export const useBuyCryptoStep = () => {
  const { onRampWindow } = useElectronApi();
  const { masterEoa } = useMasterWalletContext();
  const {
    isBuyCryptoBtnLoading,
    usdAmountToPay,
    updateIsBuyCryptoBtnLoading,
    isOnRampingTransactionSuccessful,
  } = useOnRampContext();

  const handleBuyCrypto = useCallback(async () => {
    if (!onRampWindow?.show) return;
    if (!usdAmountToPay) return;

    onRampWindow.show(usdAmountToPay);
    await delayInSeconds(1);
    updateIsBuyCryptoBtnLoading(true);
  }, [onRampWindow, usdAmountToPay, updateIsBuyCryptoBtnLoading]);

  const buyCryptoStatus = useMemo(() => {
    if (isBuyCryptoBtnLoading) return 'process';
    if (isOnRampingTransactionSuccessful) return 'finish';
    return 'wait';
  }, [isBuyCryptoBtnLoading, isOnRampingTransactionSuccessful]);

  const step: TransactionStep = {
    status: buyCryptoStatus,
    title: 'Buy crypto for fiat',
    subSteps: isOnRampingTransactionSuccessful
      ? [{ description: 'Funds received by the agent.' }]
      : [
          { description: FOLLOW_INSTRUCTIONS_MESSAGE },
          {
            description: (
              <Button
                loading={isBuyCryptoBtnLoading}
                disabled={!masterEoa?.address || !usdAmountToPay}
                onClick={handleBuyCrypto}
                type="primary"
              >
                Buy crypto
              </Button>
            ),
          },
        ],
  };

  return step;
};
