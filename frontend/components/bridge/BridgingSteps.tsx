import { LoadingOutlined } from '@ant-design/icons';
import { Button, Flex, Steps, Typography } from 'antd';
import { noop } from 'lodash';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { SUPPORT_URL } from '@/constants/urls';
import { BridgeExecutionStatus } from '@/types/Bridge';

const { Text } = Typography;

const SubStepRow = styled.div`
  line-height: normal;
`;

const TXN_COMPLETED = 'Transaction complete.';

const Desc = ({ text }: { text: string }) => (
  <Text className="text-sm text-lighter" style={{ lineHeight: 'normal' }}>
    {text}
  </Text>
);

const TxnDetails = ({ link }: { link: string }) => (
  <a href={link} target="_blank" rel="noopener noreferrer" className="pl-4">
    <Text className="text-sm text-primary">
      Txn details {UNICODE_SYMBOLS.EXTERNAL_LINK}
    </Text>
  </a>
);

type FundsAreSafeMessageProps = { onRetry?: () => void };
const FundsAreSafeMessage = ({ onRetry }: FundsAreSafeMessageProps) => (
  <Flex vertical gap={8} align="flex-start" className="mt-12 text-sm">
    {onRetry && (
      <Button onClick={onRetry} type="primary" size="small">
        Retry
      </Button>
    )}

    <Text className="text-sm text-lighter">
      Don&apos;t worry, your funds remain safe. You can access them by importing
      your Pearl seed phrase into a compatible wallet, like MetaMask or
      Coinbase.
    </Text>

    <Text className="text-sm text-lighter">
      Ask for help in{' '}
      <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
        the Olas community Discord server {UNICODE_SYMBOLS.EXTERNAL_LINK}
      </a>
    </Text>
  </Flex>
);

type SubStep = {
  description: string | null;
  txnLink: string | null;
  isFailed?: boolean;
};

type Step = {
  title: string;
  status: 'completed' | 'loading' | 'waiting' | 'error';
  subSteps: SubStep[];
};

// const txnLink =
//   'https://etherscan.io/tx/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

type Status = 'loading' | 'completed' | 'error';

type BridgingStepsProps = {
  chainName: string;
  bridgeExecutions: {
    symbol: string;
    status: BridgeExecutionStatus;
    txnLink: string | null;
  }[];
  masterSafe?: {
    creation: { status: Status; txnLink: string | null };
    transfer: { status: Status; txnLink: string | null };
  };
  onRetry?: () => void;
};

/**
 * Presentational component for the bridging steps.
 */
export const BridgingSteps = ({
  chainName,
  bridgeExecutions,
  masterSafe,
  onRetry = noop,
}: BridgingStepsProps) => {
  const bridgeSteps: Step = useMemo(() => {
    const isCompleted = bridgeExecutions.every(
      ({ status }) => status === 'DONE',
    );
    const isLoading = bridgeExecutions.some(
      ({ status }) => status === 'PENDING',
    );

    const status = (() => {
      if (isCompleted) return 'completed';
      if (isLoading) return 'loading';
      return 'error';
    })();

    return {
      title: `Bridge funds to ${chainName}`,
      status,
      subSteps: bridgeExecutions.map(({ symbol, status, txnLink }) => ({
        description: `Bridge ${symbol} transaction ${
          status === 'DONE' ? 'complete' : 'failed'
        }.`,
        txnLink,
        isFailed: status !== 'DONE' && status !== 'PENDING',
      })),
    };
  }, [chainName, bridgeExecutions]);

  const masterSafeStatus: Step[] = useMemo(() => {
    if (!masterSafe) return [];

    const { creation, transfer } = masterSafe;
    return [
      {
        title: 'Create Master Safe',
        status: creation.status,
        subSteps: [
          {
            description: TXN_COMPLETED,
            txnLink: creation.txnLink,
            isFailed: creation.status === 'error',
          },
        ],
      },
      {
        title: 'Transfer funds to the Master Safe',
        status: transfer.status,
        subSteps: [
          {
            description: TXN_COMPLETED,
            txnLink: transfer.txnLink,
            isFailed: transfer.status === 'error',
          },
        ],
      },
    ];
  }, [masterSafe]);

  const steps = useMemo(
    () => [...[bridgeSteps], ...masterSafeStatus],
    [bridgeSteps, masterSafeStatus],
  );

  return (
    <Steps
      size="small"
      direction="vertical"
      items={steps.map(({ status: currentStatus, title, subSteps }) => {
        const status = (() => {
          if (currentStatus === 'completed') return 'finish';
          if (currentStatus === 'loading') return 'process';
          if (currentStatus === 'error') return 'error';
          return 'wait';
        })();

        return {
          status,
          title,
          description: subSteps.map((subStep, index) => (
            <SubStepRow key={index} style={{ marginTop: index === 0 ? 4 : 6 }}>
              {subStep.description && <Desc text={subStep.description} />}
              {subStep.txnLink && <TxnDetails link={subStep.txnLink} />}
              {subStep.isFailed && <FundsAreSafeMessage onRetry={onRetry} />}
            </SubStepRow>
          )),
          icon: currentStatus === 'loading' ? <LoadingOutlined /> : undefined,
        };
      })}
    />
  );
};

/**
 * masterSafe = {
 *   creation: {
 *     status: 'loading' | 'completed' | 'error';
 *     txnLink: string | null;
 *   },
 *   transfer: {
 *    status: 'loading' | 'completed' | 'error';
 *    txnLink: string | null;
 *   },
 * }
 *
 * bridgeExecutions = [
 *  { symbol: 'ETH', status: 'loading' | 'completed' | 'error', txnLink: string | null },
 * ]
 */
