import { Typography } from 'antd';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import { FundsAreSafeMessage, LoadingSpinner, Steps } from '@/components/ui';
import { TokenSymbol } from '@/config/tokens';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { BridgingStepStatus as Status } from '@/types/Bridge';
import { Maybe, Nullable } from '@/types/Util';
import { asEvmChainDetails } from '@/utils/middlewareHelpers';

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
    title: 'Create Pearl Wallet',
    status,
    computedSubSteps: subSteps.map(({ txnLink, onRetry, onRetryProps }) => {
      return { description, txnLink, isFailed, onRetry, onRetryProps };
    }),
  };
};

const generateMasterSafeTransferStep = (
  status: Status,
  subSteps: StepEvent[],
): Step => {
  return {
    title: 'Transfer funds to the Pearl Wallet',
    status,
    computedSubSteps: subSteps.map(
      ({ symbol, status, txnLink, onRetry, onRetryProps }) => {
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

        return { description, txnLink, isFailed, onRetry, onRetryProps };
      },
    ),
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
      className="mt-32"
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
                  showRestartMessage
                />
              )}
            </SubStepRow>
          )),
          icon: status === 'process' ? <LoadingSpinner /> : undefined,
        };
      })}
    />
  );
};
