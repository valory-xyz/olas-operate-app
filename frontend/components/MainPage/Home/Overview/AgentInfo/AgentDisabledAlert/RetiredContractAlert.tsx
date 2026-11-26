import { Button, Typography } from 'antd';

import { Alert } from '@/components/ui';
import { PAGES, RETIRED_STAKING_PROGRAM_COPY } from '@/constants';
import { usePageState } from '@/hooks';
import {
  formatCooldownEnd,
  RetiredProgramStatus,
} from '@/utils/stakingProgram';

import {
  DeprecatedContractTitle,
  SwitchStakingContractButton,
} from './DeprecatedContract';

const { Text } = Typography;

type RetryableKind = 'safeTypeUnknown' | 'stakingDetailsUnknown';

/** A `RetiredProgramStatus`, with a retry for the two unknown states. */
export type RetiredContractAlertState =
  | Exclude<RetiredProgramStatus, { kind: RetryableKind }>
  | { kind: RetryableKind; onRetry: () => void; isRetrying: boolean };

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
        {formatCooldownEnd(cooldownEndsAt)}
      </span>
      {RETIRED_STAKING_PROGRAM_COPY.COOLDOWN_SUFFIX}
    </span>
  </Text>
);

const RetryBody = ({
  copy,
  onRetry,
  isRetrying,
}: {
  copy: string;
  onRetry: () => void;
  isRetrying: boolean;
}) => (
  <>
    <Text className="text-sm flex mt-4 mb-8">{copy}</Text>
    <Button size="small" onClick={onRetry} loading={isRetrying}>
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
            isRetrying={state.isRetrying}
          />
        );
      case 'stakingDetailsUnknown':
        return (
          <RetryBody
            copy={RETIRED_STAKING_PROGRAM_COPY.STAKING_DETAILS_UNKNOWN}
            onRetry={state.onRetry}
            isRetrying={state.isRetrying}
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
            {canSwitch && <SwitchStakingContractButton />}
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
          <DeprecatedContractTitle stakingProgramName={stakingProgramName} />
          {renderBody()}
        </>
      }
    />
  );
};
