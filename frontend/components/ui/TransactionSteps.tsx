import { LoadingOutlined } from '@ant-design/icons';
import { Steps as AntdSteps, Typography } from 'antd';
import { FC, ReactNode } from 'react';
import styled from 'styled-components';

import { COLOR } from '@/constants/colors';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { BridgingStepStatus } from '@/types/Bridge';
import { Nullable } from '@/types/Util';

const { Text } = Typography;

const Steps = styled(AntdSteps)`
  .ant-steps-item-title {
    color: ${COLOR.TEXT} !important;
  }

  .ant-steps-item-description {
    color: ${COLOR.TEXT_NEUTRAL_TERTIARY} !important;
  }

  .ant-steps-item-wait .ant-steps-item-icon {
    background-color: ${COLOR.GRAY_1};
  }

  .ant-steps-item-icon {
    width: 32px !important;
    height: 32px !important;
    border-radius: 50% !important;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ant-steps-item-tail {
    inset-inline-start: 16px !important;
    top: 4px !important;
  }
`;

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
        <SubStepContainer key={idx} style={{ marginTop: idx === 0 ? 4 : 16 }}>
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
