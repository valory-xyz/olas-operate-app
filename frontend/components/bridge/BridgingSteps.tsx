import { LoadingOutlined } from '@ant-design/icons';
import { Button, Flex, Steps, Typography } from 'antd';
import { noop } from 'lodash';
import React from 'react';
import styled from 'styled-components';

import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { SUPPORT_URL } from '@/constants/urls';

const { Text } = Typography;

const SubStep = styled.div`
  line-height: normal;
`;

type SubStep = {
  description: string | null;
  txnLink: string | null;
  isFailed?: boolean;
};

type Step = {
  title: string;
  status: 'finished' | 'loading' | 'waiting' | 'error';
  subSteps: SubStep[];
};

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

const txnLink =
  'https://etherscan.io/tx/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

const data: Step[] = [
  {
    title: 'Bridge funds to Base',
    status: 'finished',
    subSteps: [
      { description: 'Bridge OLAS transaction complete.', txnLink },
      { description: 'Bridge ETH transaction complete.', txnLink },
    ],
  },
  {
    title: 'Create Master Safe',
    status: 'finished',
    subSteps: [{ description: 'Transaction complete.', txnLink: null }],
  },
  {
    title: 'Transfer funds to the Master Safe',
    status: 'error',
    subSteps: [
      {
        description: 'Transfer ETH transaction failed.',
        txnLink,
        isFailed: true,
      },
    ],
  },
];

/**
 * Presentational component for the bridging steps.
 */
export const BridgingSteps = () => (
  <Steps
    size="small"
    direction="vertical"
    current={1}
    status="error"
    items={data.map(({ status: currentStatus, title, subSteps }) => {
      const status = (() => {
        if (currentStatus === 'finished') return 'finish';
        if (currentStatus === 'loading') return 'process';
        if (currentStatus === 'error') return 'error';
        return 'wait';
      })();

      return {
        title,
        description: subSteps.map((subStep, index) => (
          <SubStep key={index} style={{ marginTop: index === 0 ? 4 : 6 }}>
            <Text
              className="text-sm text-lighter"
              style={{ lineHeight: 'normal' }}
            >
              {subStep.description}
            </Text>

            {subStep.txnLink && (
              <a
                href={subStep.txnLink}
                target="_blank"
                rel="noopener noreferrer"
                className="pl-4"
              >
                <Text className="text-sm text-primary">
                  Txn details {UNICODE_SYMBOLS.EXTERNAL_LINK}
                </Text>
              </a>
            )}

            {subStep.isFailed && <FundsAreSafeMessage onRetry={noop} />}
          </SubStep>
        )),
        icon: currentStatus === 'loading' ? <LoadingOutlined /> : undefined,
        status,
      };
    })}
  />
);
