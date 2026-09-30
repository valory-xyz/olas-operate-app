import { Flex, Typography } from 'antd';
import { isNil } from 'lodash';
import { TbArrowUpRight, TbCheck, TbSquareCheckFilled } from 'react-icons/tb';

import { COLOR } from '@/constants';
import { FundingRun, FundingRunStep } from '@/types/FundingRun';

import {
  FUNDS_SAFE,
  GENERIC_FAILURE,
  SLOW_STEP,
  SUCCESS_BANNER,
} from './constants';
import { FailureDetails } from './FailureDetails';
import { Banner, CardRow } from './styles';
import {
  getCurrentStep,
  getFailedStep,
  getLogSteps,
  getStepText,
} from './utils';

const { Text } = Typography;

/** Local wall-clock time, e.g. "16:45:15". */
export const formatStepTime = (unixSeconds: number | null) =>
  isNil(unixSeconds)
    ? ''
    : new Date(unixSeconds * 1000).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

const StatusBanner = ({
  run,
  failureText,
}: {
  run: FundingRun;
  failureText: string | null;
}) => {
  if (run.status === 'COMPLETED') {
    return (
      <Banner tone="success" icon={<TbCheck />}>
        {SUCCESS_BANNER[run.mode]}
      </Banner>
    );
  }
  if (failureText) return <Banner tone="error">{failureText}</Banner>;
  const currentStep = getCurrentStep(run);
  if (!currentStep) return null;
  return (
    <Banner tone="progress">
      <Flex vertical align="center">
        <span>{getStepText(run, currentStep, 'inProgress')}</span>
        {currentStep.is_slow && <Text className="text-sm">{SLOW_STEP}</Text>}
      </Flex>
    </Banner>
  );
};

const LogRow = ({ run, step }: { run: FundingRun; step: FundingRunStep }) => (
  <CardRow justify="space-between" align="center" gap={12}>
    <Flex gap={10} align="center">
      <TbSquareCheckFilled size={20} color={COLOR.SUCCESS} />
      <Text>{getStepText(run, step, 'done')}</Text>
    </Flex>
    <Flex gap={16} align="center">
      <Text className="text-sm text-neutral-tertiary">
        {formatStepTime(step.finished_at)}
      </Text>
      {step.explorer_link && (
        <a href={step.explorer_link} target="_blank" rel="noopener noreferrer">
          Details <TbArrowUpRight />
        </a>
      )}
    </Flex>
  </CardRow>
);

type FundingProgressProps = {
  run: FundingRun;
  onRetry: () => void;
  isRetrying: boolean;
};

export const FundingProgress = ({
  run,
  onRetry,
  isRetrying,
}: FundingProgressProps) => {
  const failedStep = getFailedStep(run);
  const logSteps = getLogSteps(run, failedStep);
  // Banner and failure row name the same step, so they cannot disagree.
  let failureText: string | null = null;
  if (failedStep) failureText = getStepText(run, failedStep, 'failed');
  else if (run.status === 'FAILED') failureText = GENERIC_FAILURE;

  return (
    <>
      <StatusBanner run={run} failureText={failureText} />
      {failureText && (
        <CardRow>
          <FailureDetails
            title={failureText}
            description={FUNDS_SAFE}
            onRetry={onRetry}
            isRetrying={isRetrying}
            extra={
              failedStep
                ? formatStepTime(
                    failedStep.finished_at ?? failedStep.started_at,
                  )
                : undefined
            }
          />
        </CardRow>
      )}
      {logSteps.map((step) => (
        <LogRow key={step.id} run={run} step={step} />
      ))}
    </>
  );
};
