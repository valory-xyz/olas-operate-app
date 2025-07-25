import { LoadingOutlined } from '@ant-design/icons';
import { Steps, Typography } from 'antd';
import { FC, ReactNode } from 'react';
import styled from 'styled-components';

import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { BridgingStepStatus } from '@/types/Bridge';
import { Nullable } from '@/types/Util';

const { Text } = Typography;

const SubStepContainer = styled.div`
  line-height: normal;
`;

const Description = ({ children }: { children: ReactNode }) =>
  typeof children === 'string' ? (
    <Text className="text-sm text-lighter" style={{ lineHeight: 'normal' }}>
      {children}
    </Text>
  ) : (
    <>{children}</>
  );

const TransactionLink = ({ href }: { href: string }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="pl-4">
    <Text className="text-sm text-primary">
      Txn details {UNICODE_SYMBOLS.EXTERNAL_LINK}
    </Text>
  </a>
);

export type TransactionSubStep = {
  description?: ReactNode;
  txnLink?: Nullable<string>;
  failed?: ReactNode;
};

export type TransactionStep = {
  status: BridgingStepStatus;
  title: string;
  subSteps?: TransactionSubStep[];
};

type TransactionStepsProps = {
  steps: TransactionStep[];
};

/**
 * Presentational component for displaying transaction steps.
 * To list vertical steps, each with sub-steps and optional transaction links.
 */
export const TransactionSteps: FC<TransactionStepsProps> = ({ steps }) => (
  <Steps
    items={steps.map(({ status, title, subSteps }) => ({
      status,
      title,
      description: (subSteps || []).map((subStep, idx) => (
        <SubStepContainer key={idx} style={{ marginTop: idx === 0 ? 4 : 6 }}>
          {subStep.description && (
            <Description>{subStep.description}</Description>
          )}
          {subStep.txnLink && <TransactionLink href={subStep.txnLink} />}
          {subStep.failed}
        </SubStepContainer>
      )),
      icon: status === 'process' ? <LoadingOutlined /> : undefined,
    }))}
    size="small"
    direction="vertical"
  />
);
