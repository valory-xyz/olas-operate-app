import { Button, Typography } from 'antd';

import { Alert } from '@/components/ui';
import { PAGES, RETIRED_STAKING_PROGRAM_COPY } from '@/constants';
import { usePageState } from '@/hooks';
import { formatToShortDateTime } from '@/utils/time';

const { Text } = Typography;

/** The one variant of the alert to show; built by `AgentDisabledAlert`. */
export type RetiredContractAlertState =
  /** The agent can't switch to a new contract: it only redeems and withdraws. */
  | { kind: 'withdrawalOnly' }
  /** Inside the minimum staking period; `endsAt` in seconds. */
  | { kind: 'cooldown'; endsAt: number }
  /** The Safe type couldn't be read, so neither variant can be offered yet. */
  | { kind: 'safeTypeUnknown'; onRetry: () => void }
  /** Switch to another program, once `canSwitch` (unstaked, details and Safe type known). */
  | { kind: 'switch'; canSwitch: boolean };

type RetiredContractAlertProps = {
  /** Undefined once the program can no longer be named (stored as `no_staking`). */
  stakingProgramName?: string;
  state: RetiredContractAlertState;
};

const CooldownBody = ({ cooldownEndsAt }: { cooldownEndsAt: number }) => (
  <Text className="text-sm flex mt-4">
    <span>
      Pearl no longer supports deprecated contracts. Your agent is in a cooldown
      period until{' '}
      <span className="font-weight-600">
        {formatToShortDateTime(cooldownEndsAt * 1000)} (UTC)
      </span>
      . After that, switch to one of the available contracts to run your agent
      again.
    </span>
  </Text>
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
          <>
            <Text className="text-sm flex mt-4 mb-8">
              {RETIRED_STAKING_PROGRAM_COPY.SAFE_TYPE_UNKNOWN}
            </Text>
            <Button size="small" onClick={state.onRetry}>
              Retry
            </Button>
          </>
        );
      case 'switch':
        if (!state.canSwitch) {
          return (
            <Text className="text-sm flex mt-4">
              {RETIRED_STAKING_PROGRAM_COPY.SWITCH}
            </Text>
          );
        }
        return (
          <>
            <Text className="text-sm flex mt-4 mb-8">
              {RETIRED_STAKING_PROGRAM_COPY.SWITCH}
            </Text>
            <Button size="small" onClick={() => goto(PAGES.SelectStaking)}>
              Switch Staking Contract
            </Button>
          </>
        );
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
