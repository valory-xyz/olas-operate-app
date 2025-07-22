import { LoadingOutlined } from '@ant-design/icons';
import { Steps, Typography } from 'antd';
import React, { ReactNode } from 'react';
import styled from 'styled-components';

import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { BridgingStepStatus as Status } from '@/types/Bridge';

const { Text } = Typography;

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

type StepEvent = {
  description?: ReactNode;
  txnLink?: string;
  failed?: ReactNode;
};

type TransactionStepsProps = {
  steps: { status: Status; title: string; subSteps: StepEvent[] }[];
};

/**
 * Presentational component for the transaction steps.
 */
export const TransactionSteps = ({ steps }: TransactionStepsProps) => {
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
              {subStep.failed && subStep.failed}
            </SubStepRow>
          )),
          icon: status === 'process' ? <LoadingOutlined /> : undefined,
        };
      })}
    />
  );
};
