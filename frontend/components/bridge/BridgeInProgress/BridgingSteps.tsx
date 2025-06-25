import { LoadingOutlined } from '@ant-design/icons';
import { Button, Flex, Steps, Typography } from 'antd';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { SUPPORT_URL } from '@/constants/urls';
import { TokenSymbol } from '@/enums/Token';
import { BridgingStepStatus as Status } from '@/types/Bridge';
import { Maybe, Nullable } from '@/types/Util';
import { asEvmChainDetails } from '@/utils/middlewareHelpers';

import { ExportLogsButton } from '../../ExportLogsButton';

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

type FundsAreSafeMessageProps = Pick<StepEvent, 'onRetry' | 'onRetryProps'>;
const FundsAreSafeMessage = ({
  onRetry,
  onRetryProps,
}: FundsAreSafeMessageProps) => (
  <Flex vertical gap={8} align="flex-start" className="mt-12 text-sm">
    <Flex gap={8}>
      {onRetry && (
        <Button
          loading={onRetryProps?.isLoading}
          onClick={onRetry}
          type="primary"
          size="small"
        >
          Retry
        </Button>
      )}
      <ExportLogsButton size="small" />
    </Flex>

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

    <Text className="text-sm text-lighter">
      You can also try restarting the app!
    </Text>
  </Flex>
);

type Step = {
  title: string;
  status: Status;
  computedSubSteps: {
    description: Nullable<string>;
    txnLink: Maybe<string>;
    isFailed?: boolean;
    onRetry?: () => void;
    onRetryProps?: { isLoading: boolean };
  }[];
};

export type StepEvent = {
  symbol?: TokenSymbol;
  status?: Status;
  txnLink?: Maybe<string>;
  onRetry?: () => void;
  onRetryProps?: { isLoading: boolean };
};

const generateBridgeStep = (
  status: Status,
  subSteps: StepEvent[],
): Omit<Step, 'title'> => {
  return {
    status,
    computedSubSteps: subSteps.map(
      ({ symbol, status, txnLink, onRetry, onRetryProps }) => {
        const isFailed = status === 'error';
        const description = (() => {
          if (status === 'finish') {
            return `Bridging ${symbol || ''} transaction complete.`;
          }
          if (status === 'error') {
            return `Bridging ${symbol || ''} failed.`;
          }
          return `Sending transaction...`;
        })();

        return { description, txnLink, isFailed, onRetry, onRetryProps };
      },
    ),
  };
};

const generateMasterSafeCreationStep = (
  status: Status,
  subSteps: StepEvent[],
): Step => {
  const isFailed = status === 'error';
  const description = (() => {
    if (status === 'finish') return 'Transaction complete.';
    if (status === 'error') return 'Transaction failed.';
    if (status === 'process') return 'Sending transaction...';
    return null;
  })();

  return {
    title: 'Create Master Safe',
    status,
    computedSubSteps: subSteps.map(({ txnLink }) => {
      return { description, txnLink, isFailed };
    }),
  };
};

const generateMasterSafeTransferStep = (
  status: Status,
  subSteps: StepEvent[],
): Step => {
  return {
    title: 'Transfer funds to the Master Safe',
    status,
    computedSubSteps: subSteps.map(({ symbol, status, txnLink }) => {
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

type BridgingStep = { status: Status; subSteps: StepEvent[] };

type BridgingStepsProps = {
  chainName: string;
  bridge: BridgingStep;
  masterSafeCreation?: BridgingStep;
  masterSafeTransfer?: BridgingStep;
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
      title: `Bridge funds to ${asEvmChainDetails(chainName).displayName}`,
      ...generateBridgeStep(bridge.status, bridge.subSteps),
    };
  }, [chainName, bridge]);

  const masterSafeCreationStep: Nullable<Step> = useMemo(() => {
    if (!masterSafeCreation) return null;
    return generateMasterSafeCreationStep(
      masterSafeCreation.status,
      masterSafeCreation.subSteps,
    );
  }, [masterSafeCreation]);

  const masterSafeTransferStep: Nullable<Step> = useMemo(() => {
    if (!masterSafeTransfer) return null;
    return generateMasterSafeTransferStep(
      masterSafeTransfer.status,
      masterSafeTransfer.subSteps,
    );
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
      items={steps.map(({ status, title, computedSubSteps }) => {
        return {
          status,
          title,
          description: computedSubSteps.map((subStep, index) => (
            <SubStepRow key={index} style={{ marginTop: index === 0 ? 4 : 6 }}>
              {subStep.description && <Desc text={subStep.description} />}
              {subStep.txnLink && <TxnDetails link={subStep.txnLink} />}
              {subStep.isFailed && (
                <FundsAreSafeMessage
                  onRetry={subStep.onRetry}
                  onRetryProps={subStep.onRetryProps}
                />
              )}
            </SubStepRow>
          )),
          icon: status === 'process' ? <LoadingOutlined /> : undefined,
        };
      })}
    />
  );
};
