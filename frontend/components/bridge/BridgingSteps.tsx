import { LoadingOutlined } from '@ant-design/icons';
import { Button, Flex, Steps, Typography } from 'antd';
import { noop } from 'lodash';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { SUPPORT_URL } from '@/constants/urls';
import { TokenSymbol } from '@/enums/Token';
import { BridgingStepStatus as Status } from '@/types/Bridge';
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

type Step = {
  title: string;
  status: Status;
  subSteps: {
    description: Nullable<string>;
    txnLink: Nullable<string>;
    isFailed?: boolean;
    onRetry?: () => void;
  }[];
};

const generateBridgeStep = (
  status: Status,
  subSteps: StepEvent[],
): Omit<Step, 'title'> => {
  return {
    status,
    subSteps: subSteps.map(({ symbol, status, txnLink }) => {
      const isFailed = status === 'error';
      const description = (() => {
        if (status === 'finish') {
          return `Bridging ${symbol} transaction complete.`;
        }
        if (status === 'error') {
          return `Bridging ${symbol} failed.`;
        }
        return `Sending transaction...`;
      })();

      return { description, txnLink, isFailed };
    }),
  };
};

const generateMasterSafeCreationStep = (
  status: Status,
  txnLink: Nullable<string>,
): Omit<Step, 'title'> => {
  const isFailed = status === 'error';
  return {
    status,
    subSteps: [{ description: getDescription(status), txnLink, isFailed }],
  };
};

const generateMasterSafeTransferStep = (
  status: Status,
  subSteps: StepEvent[],
): Omit<Step, 'title'> => {
  return {
    status,
    subSteps: subSteps.map(({ symbol, status, txnLink }) => {
      const isFailed = status === 'error';
      const description = (() => {
        if (status === 'finish') {
          return `Transfer ${symbol} transaction complete.`;
        }
        if (status === 'process') {
          return 'Sending transaction...';
        }
        if (status === 'error') {
          return `Transfer ${symbol} transaction failed.`;
        }
        return null;
      })();

      return { description, txnLink, isFailed };
    }),
  };
};

const getDescription = (status: Status) => {
  if (status === 'finish') return `Transaction complete.`;
  if (status === 'error') return `Transaction failed.`;
  if (status === 'process') return `Sending transaction...`;
  return null;
};

type StepEvent = {
  symbol: TokenSymbol;
  status: Status;
  txnLink: Nullable<string>;
  onRetry?: () => void;
};

// TODO: simplify status
type BridgingStepsProps = {
  chainName: string;
  bridge: {
    status: Status;
    executions: StepEvent[];
  };
  masterSafeCreation?: {
    status: Status;
    txnLink: Nullable<string>;
    onRetry?: () => void;
  };
  masterSafeTransfer?: {
    status: Status;
    transfers: StepEvent[];
  };
};

/**
 * Presentational component for the bridging steps.
 */
export const BridgingSteps = ({
  chainName,
  bridge,
  masterSafeCreation,
  masterSafeTransfer,
}: BridgingStepsProps) => {
  const bridgeStep: Step = useMemo(() => {
    return {
      title: `Bridge funds to ${chainName}`,
      ...generateBridgeStep(bridge.status, bridge.executions),
    };
  }, [chainName, bridge]);

  const masterSafeCreationStep: Nullable<Step> = useMemo(() => {
    if (!masterSafeCreation) return null;

    return {
      title: 'Create Master Safe',
      ...generateMasterSafeCreationStep(
        masterSafeCreation.status,
        masterSafeCreation.txnLink,
      ),
    };
  }, [masterSafeCreation]);

  const masterSafeTransferStep: Nullable<Step> = useMemo(() => {
    if (!masterSafeTransfer) return null;

    return {
      title: 'Transfer funds to the Master Safe',
      ...generateMasterSafeTransferStep(
        masterSafeTransfer.status,
        masterSafeTransfer.transfers,
      ),
    };
  }, [masterSafeTransfer]);

  const steps = useMemo(
    () =>
      [bridgeStep, masterSafeCreationStep, masterSafeTransferStep].filter(
        (step): step is Step => Boolean(step),
      ),
    [bridgeStep, masterSafeCreationStep, masterSafeTransferStep],
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
              {subStep.isFailed && (
                <FundsAreSafeMessage onRetry={subStep.onRetry || noop} />
              )}
            </SubStepRow>
          )),
          icon: status === 'process' ? <LoadingOutlined /> : undefined,
        };
      })}
    />
  );
};
