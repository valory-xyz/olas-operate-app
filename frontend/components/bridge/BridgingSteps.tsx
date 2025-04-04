import { LoadingOutlined } from '@ant-design/icons';
import { Button, Flex, Steps, Typography } from 'antd';
import { noop } from 'lodash';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { SUPPORT_URL } from '@/constants/urls';
import { TokenSymbol } from '@/enums/Token';
import { BridgingStepStatus } from '@/types/Bridge';
import { Nullable } from '@/types/Util';

const { Text } = Typography;

const SubStepRow = styled.div`
  line-height: normal;
`;

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

type Status = BridgingStepStatus;

type SubStep = {
  description: Nullable<string>;
  txnLink: Nullable<string>;
  isFailed?: boolean;
};

type Step = { title: string; status: Status; subSteps: SubStep[] };

type BridgingStepsProps = {
  chainName: string;
  bridge: {
    status: Status;
    executions: {
      symbol: TokenSymbol;
      status: Status;
      txnLink: Nullable<string>;
    }[];
  };
  masterSafe?: {
    creation: { status: Status; txnLink: Nullable<string> };
    transfer: { status: Status; txnLink: Nullable<string> };
  };
  onRetry?: () => void;
};

/**
 * Presentational component for the bridging steps.
 */
export const BridgingSteps = ({
  chainName,
  bridge,
  masterSafe,
  onRetry = noop,
}: BridgingStepsProps) => {
  const bridgeSteps: Step = useMemo(() => {
    return {
      title: `Bridge funds to ${chainName}`,
      status: bridge.status,
      subSteps: bridge.executions.map(({ symbol, status, txnLink }) => {
        // TODO: simplify this logic
        const description = (() => {
          if (status === 'finish') {
            return `Bridging ${symbol} transaction complete.`;
          }
          if (status === 'wait') {
            return `Sending transaction...`;
          }
          if (status === 'error') {
            return `Bridging ${symbol} failed.`;
          }
          return `Bridging ${symbol} in progress...`;
        })();

        return {
          description,
          txnLink,
          isFailed: status === 'error',
        };
      }),
    };
  }, [chainName, bridge]);

  const masterSafeStatus: Step[] = useMemo(() => {
    if (!masterSafe) return [];

    const { creation, transfer } = masterSafe;
    return [
      {
        title: 'Create Master Safe',
        status: creation.status,
        subSteps: [
          {
            description: 'Transaction complete.',
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
            description: 'Transaction complete.',
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
      items={steps.map(({ status, title, subSteps }) => {
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
          icon: status === 'process' ? <LoadingOutlined /> : undefined,
        };
      })}
    />
  );
};
