import { Button, Typography } from 'antd';

import { Alert } from '@/components/ui';
import { PAGES, RETIRED_STAKING_PROGRAM_COPY } from '@/constants';
import { usePageState } from '@/hooks';
import { formatToShortDateTime } from '@/utils/time';

const { Text } = Typography;

type RetiredContractAlertProps = {
  stakingProgramName: string;
  /** The agent cannot switch to a new contract: it only redeems and withdraws. */
  isWithdrawalOnly: boolean;
  /** End of the minimum staking period in seconds, while the agent is inside it. */
  cooldownEndsAt?: number;
  /**
   * Whether the switch can go ahead now: the agent is unstaked and its Safe
   * type is known. Otherwise the body shows without a button.
   */
  canSwitch: boolean;
  /** Set when the Safe type couldn't be read: offers a retry instead of a variant that may be wrong. */
  onRetrySafeType?: () => void;
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
  isWithdrawalOnly,
  cooldownEndsAt,
  canSwitch,
  onRetrySafeType,
}: RetiredContractAlertProps) => {
  const { goto } = usePageState();

  const renderBody = () => {
    if (isWithdrawalOnly) {
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
    }

    if (cooldownEndsAt) {
      return <CooldownBody cooldownEndsAt={cooldownEndsAt} />;
    }

    if (onRetrySafeType) {
      return (
        <>
          <Text className="text-sm flex mt-4 mb-8">
            {RETIRED_STAKING_PROGRAM_COPY.SAFE_TYPE_UNKNOWN}
          </Text>
          <Button size="small" onClick={onRetrySafeType}>
            Retry
          </Button>
        </>
      );
    }

    if (!canSwitch) {
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
  };

  return (
    <Alert
      showIcon
      className="mt-16"
      type="error"
      message={
        <>
          <Text className="text-sm font-weight-500">
            {stakingProgramName} contract is deprecated
          </Text>
          {renderBody()}
        </>
      }
    />
  );
};
