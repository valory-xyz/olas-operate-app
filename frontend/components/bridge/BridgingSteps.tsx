import { LoadingOutlined } from '@ant-design/icons';
import { Steps, Typography } from 'antd';
import React from 'react';
import styled from 'styled-components';

import { UNICODE_SYMBOLS } from '@/constants/symbols';

const { Text } = Typography;

const SubStep = styled.div`
  line-height: normal;
`;

type SubStep = {
  description: string | null;
  txnLink: string | null;
};

type Step = {
  title: string;
  status: 'finished' | 'loading' | 'waiting' | 'error';
  subSteps: SubStep[];
};

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
    status: 'loading',
    subSteps: [{ description: 'Transaction complete.', txnLink: null }],
  },
  {
    title: 'Transfer funds to the Master Safe',
    status: 'waiting',
    subSteps: [],
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
          </SubStep>
        )),
        icon: currentStatus === 'loading' ? <LoadingOutlined /> : undefined,
        status,
      };
    })}
  />
);
