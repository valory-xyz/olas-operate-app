import { LoadingOutlined } from '@ant-design/icons';
import { Button, Steps, Typography } from 'antd';
import React, { FC, ReactNode, useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useSharedContext } from '@/hooks/useSharedContext';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { delayInSeconds } from '@/utils/delay';

type SubStep = {
  description?: ReactNode;
  txnLink?: string;
  isFailed?: boolean;
  onRetry?: () => void;
  onRetryProps?: Record<string, unknown>;
};

const { Text } = Typography;

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

type FundsAreSafeMessageProps = {
  onRetry?: () => void;
  onRetryProps?: Record<string, unknown>;
};
const FundsAreSafeMessage: FC<FundsAreSafeMessageProps> = ({
  onRetry,
  onRetryProps,
}) => (
  <div style={{ color: 'red' }}>
    Something went wrong.{' '}
    {onRetry && (
      <Button onClick={onRetry} style={{ marginLeft: 8 }} {...onRetryProps}>
        Retry
      </Button>
    )}
  </div>
);

export const OnRampPaymentSteps = () => {
  const { onRampWindow } = useElectronApi();
  const { masterEoa } = useMasterWalletContext();
  const {
    isBuyCryptoBtnLoading,
    usdAmountToPay,
    updateIsBuyCryptoBtnLoading,
    isOnRampingTransactionSuccessful,
  } = useSharedContext();

  const handleBuyCrypto = useCallback(async () => {
    if (!onRampWindow?.show) return;

    onRampWindow.show();
    await delayInSeconds(1);
    updateIsBuyCryptoBtnLoading(true);
  }, [onRampWindow, updateIsBuyCryptoBtnLoading]);

  const buyCryptoStatus = useMemo(() => {
    if (isBuyCryptoBtnLoading) return 'process';
    if (isOnRampingTransactionSuccessful) return 'finish';
    return 'wait';
  }, [isBuyCryptoBtnLoading, isOnRampingTransactionSuccessful]);

  const steps: StepItem[] = [
    {
      status: buyCryptoStatus,
      title: 'Buy crypto for fiat',
      computedSubSteps: [
        {
          description:
            'Follow the instructions to fund your agent for the preferred fiat currency. Pearl will handle the rest.',
        },
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
    },
  ];

  return (
    <Steps
      size="small"
      direction="vertical"
      current={0}
      items={steps.map(({ status, title, computedSubSteps }) => ({
        status,
        title,
        description: (
          <>
            {computedSubSteps.map((subStep, index) => (
              <SubStepRow
                key={index}
                style={{ marginTop: index === 0 ? 4 : 6 }}
              >
                {subStep.description && <Desc text={subStep.description} />}
                {subStep.txnLink && <TxnDetails link={subStep.txnLink} />}
                {subStep.isFailed && (
                  <FundsAreSafeMessage
                    onRetry={subStep.onRetry}
                    onRetryProps={subStep.onRetryProps}
                  />
                )}
              </SubStepRow>
            ))}
          </>
        ),
        icon: status === 'process' ? <LoadingOutlined /> : undefined,
      }))}
    />
  );
};
