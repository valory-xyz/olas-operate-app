import { Button, Typography } from 'antd';

import { Alert } from '@/components/ui';
import { PAGES, RETIRED_STAKING_PROGRAM_COPY } from '@/constants';
import { usePageState } from '@/hooks';
import { RetiredProgramStatus } from '@/utils/stakingProgram';
import { formatToShortDateTime } from '@/utils/time';

const { Text } = Typography;

type RetryableKind = 'safeTypeUnknown' | 'stakingDetailsUnknown';

/**
 * The variant to show: a `RetiredProgramStatus`, with a retry for the two
 * unknown states. Derived, so a new status fails to compile until handled.
 */
export type RetiredContractAlertState =
  | Exclude<RetiredProgramStatus, { kind: RetryableKind }>
  | { kind: RetryableKind; onRetry: () => void };

type RetiredContractAlertProps = {
  /** Undefined once the program can no longer be named (stored as `no_staking`). */
  stakingProgramName?: string;
  state: RetiredContractAlertState;
};

const CooldownBody = ({ cooldownEndsAt }: { cooldownEndsAt: number }) => (
  <Text className="text-sm flex mt-4">
    <span>
      {RETIRED_STAKING_PROGRAM_COPY.COOLDOWN_PREFIX}{' '}
      <span className="font-weight-600">
        {formatToShortDateTime(cooldownEndsAt * 1000)} (UTC)
      </span>
      {RETIRED_STAKING_PROGRAM_COPY.COOLDOWN_SUFFIX}
    </span>
  </Text>
);

const RetryBody = ({
  copy,
  onRetry,
}: {
  copy: string;
  onRetry: () => void;
}) => (
  <>
    <Text className="text-sm flex mt-4 mb-8">{copy}</Text>
    <Button size="small" onClick={onRetry}>
      Retry
    </Button>
  </>
);

export const RetiredContractAlert = ({
  stakingProgramName,
  state,
}: RetiredContractAlertProps) => {
  const { goto } = usePageState();

  const renderBody = () => {
    switch (state.kind) {
      case 'withdrawalOnly':
        return (
          <>
            <Text className="text-sm flex mt-4 mb-8">
              {RETIRED_STAKING_PROGRAM_COPY.WITHDRAWAL_ONLY}
            </Text>
            <Button size="small" onClick={() => goto(PAGES.AgentWallet)}>
              Withdraw
            </Button>
          </>
        );
      case 'cooldown':
        return <CooldownBody cooldownEndsAt={state.endsAt} />;
      case 'safeTypeUnknown':
        return (
          <RetryBody
            copy={RETIRED_STAKING_PROGRAM_COPY.SAFE_TYPE_UNKNOWN}
            onRetry={state.onRetry}
          />
        );
      case 'stakingDetailsUnknown':
        return (
          <RetryBody
            copy={RETIRED_STAKING_PROGRAM_COPY.STAKING_DETAILS_UNKNOWN}
            onRetry={state.onRetry}
          />
        );
      case 'safeTypeLoading':
      case 'stakingDetailsLoading':
        // The title only, until both are known.
        return null;
      case 'awaitingUnstake':
      case 'switch': {
        const canSwitch = state.kind === 'switch';
        return (
          <>
            <Text className={`text-sm flex mt-4 ${canSwitch ? 'mb-8' : ''}`}>
              {RETIRED_STAKING_PROGRAM_COPY.SWITCH}
            </Text>
            {canSwitch && (
              <Button size="small" onClick={() => goto(PAGES.SelectStaking)}>
                Switch Staking Contract
              </Button>
            )}
          </>
        );
      }
    }
  };

  return (
    <Alert
      showIcon
      className="mt-16"
      type="error"
      message={
        <>
          <Text className="text-sm font-weight-500">
            {stakingProgramName
              ? `${stakingProgramName} contract is deprecated`
              : 'Staking contract is deprecated'}
          </Text>
          {renderBody()}
        </>
      }
    />
  );
};
