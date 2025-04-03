import { Steps } from 'antd';
import React from 'react';

type SubStep = {
  description: string | null;
  txnLink: string | null;
};

type Step = {
  title: string;
  status: 'finished' | 'loading' | 'waiting';
  subSteps: SubStep[];
};

const data: Step[] = [
  {
    title: 'Bridge funds to Base',
    status: 'finished',
    subSteps: [
      {
        description: 'Bridge OLAS transaction complete.',
        txnLink:
          'https://etherscan.io/tx/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      },
      { description: 'Sending transaction...', txnLink: null },
    ],
  },
  {
    title: 'Bridge funds to Base',
    status: 'loading',
    subSteps: [{ description: 'Sending transaction...', txnLink: null }],
  },
  {
    title: 'Transfer funds to the Master Safe',
    status: 'waiting',
    subSteps: [{ description: null, txnLink: null }],
  },
];

/**
 * Presentational component for the bridging steps.
 */
export const BridgingSteps = () => (
  <Steps
    direction="vertical"
    current={1}
    items={data.map((item) => ({
      title: item.title,
      description: (
        <ul>
          {item.subSteps.map((subStep, index) => (
            <li key={index}>
              {subStep.description}
              {subStep.txnLink && (
                <a
                  href={subStep.txnLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Transaction
                </a>
              )}
            </li>
          ))}
        </ul>
      ),
      status:
        item.status === 'finished'
          ? 'finish'
          : item.status === 'loading'
            ? 'process'
            : 'wait',
    }))}
  />
);
