import { Button, Typography } from 'antd';

import { Alert } from '@/components/ui';

const { Text } = Typography;

type NoStakingRewardsAlertProps = {
  /**
   * When provided, renders a "Switch Staking Contract" button that invokes it.
   * Omit on surfaces where the user is already choosing a contract.
   */
  onSwitch?: () => void;
  className?: string;
};

/**
 * Non-blocking warning shown when a staking contract's reward pool is empty
 * (`availableRewards === 0`). The agent can still run and be staked, but it
 * won't earn staking rewards until the contract is refilled (OPE-1846).
 */
export const NoStakingRewardsAlert = ({
  onSwitch,
  className,
}: NoStakingRewardsAlertProps) => (
  <Alert
    showIcon
    type="warning"
    className={className}
    message={
      <>
        <Text className="text-sm font-weight-500">
          No staking rewards available
        </Text>
        <Text className={`text-sm flex mt-4 ${onSwitch ? 'mb-8' : ''}`}>
          This staking contract&apos;s reward pool is currently empty. Your
          agent can still run, but it won&apos;t earn staking rewards until the
          contract is refilled.
        </Text>
        {onSwitch && (
          <Button size="small" onClick={onSwitch}>
            Switch Staking Contract
          </Button>
        )}
      </>
    }
  />
);
