import { LoadingOutlined } from '@ant-design/icons';
import { Button, Steps, Typography } from 'antd';
import { ReactNode, useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useOnRampContext } from '@/hooks/useOnRampContext';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { delayInSeconds } from '@/utils/delay';

const { Text } = Typography;

const FOLLOW_INSTRUCTIONS_MESSAGE =
  'Follow the instructions to fund your agent for the preferred fiat currency. Pearl will handle the rest.';

type SubStep = {
  description?: ReactNode;
  txnLink?: string;
  isFailed?: boolean;
  onRetry?: () => void;
  onRetryProps?: Record<string, unknown>;
};

type StepItem = {
  status: 'wait' | 'process' | 'finish' | 'error';
  title: string;
  computedSubSteps: SubStep[];
};

const SubStepRow = styled.div`
  line-height: normal;
`;

const Desc = ({ text }: { text: ReactNode }) =>
  typeof text === 'string' ? (
    <Text className="text-sm text-lighter" style={{ lineHeight: 'normal' }}>
      {text}
    </Text>
  ) : (
    text
  );

const TxnDetails = ({ link }: { link: string }) => (
  <a href={link} target="_blank" rel="noopener noreferrer" className="pl-4">
    <Text className="text-sm text-primary">
      Txn details {UNICODE_SYMBOLS.EXTERNAL_LINK}
    </Text>
  </a>
);

const useBuyCryptoSteps = () => {
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

  const step: StepItem = {
    status: buyCryptoStatus,
    title: 'Buy crypto for fiat',
    computedSubSteps: isOnRampingTransactionSuccessful
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

export const OnRampPaymentSteps = () => {
  const steps = [useBuyCryptoSteps()];

  return (
    <Steps
      size="small"
      direction="vertical"
      current={0}
      items={steps.map(({ status, title, computedSubSteps }) => ({
        status,
        title,
        description: computedSubSteps.map((subStep, index) => (
          <SubStepRow key={index} style={{ marginTop: index === 0 ? 4 : 6 }}>
            {subStep.description && <Desc text={subStep.description} />}
            {subStep.txnLink && <TxnDetails link={subStep.txnLink} />}
          </SubStepRow>
        )),
        icon: status === 'process' ? <LoadingOutlined /> : undefined,
      }))}
    />
  );
};
