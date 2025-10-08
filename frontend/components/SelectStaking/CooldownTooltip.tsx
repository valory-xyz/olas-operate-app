import { Flex, Statistic, Tooltip, Typography } from 'antd';
import { isNil } from 'lodash';
import { type CSSProperties, useMemo } from 'react';

import { COLOR } from '@/constants/colors';
import { useActiveStakingContractDetails } from '@/hooks/useStakingContractDetails';

const { Text, Paragraph } = Typography;
const { Countdown } = Statistic;

const overlayStyle: CSSProperties = {
  maxWidth: 368,
};

const overlayInnerStyle: CSSProperties = {
  padding: 16,
  borderRadius: 16,
  backgroundColor: COLOR.WHITE,
};

const CooldownExplanation = () => (
  <>
    <div>
      <Paragraph className="mb-4 text-sm" strong>
        What is the cooldown?
      </Paragraph>
      <Text className="text-sm">
        Whenever an agent unstakes from a contract, it enters a cooldown period.
      </Text>
    </div>

    <div>
      <Paragraph className="mb-4 text-sm" strong>
        Why does a cooldown happen?
      </Paragraph>
      <ol className="mt-0 pl-20 mb-0 text-sm">
        <li>You recently switched the staking contract.</li>
        <li>Your agent is currently evicted.</li>
      </ol>
    </div>
  </>
);

const CooldownPeriodContent = () => {
  const { selectedStakingContractDetails } = useActiveStakingContractDetails();

  const timeUntilMigration = useMemo(() => {
    const { serviceStakingStartTime, minimumStakingDuration } =
      selectedStakingContractDetails ?? {};

    if (isNil(minimumStakingDuration) || isNil(serviceStakingStartTime)) return;

    const now = Math.round(Date.now() / 1000);
    const timeSinceLastStaked = now - serviceStakingStartTime;
    const timeUntilMigrationInSeconds =
      minimumStakingDuration - timeSinceLastStaked;

    // Convert to target timestamp in milliseconds (current time + remaining seconds)
    const targetTimestamp =
      timeUntilMigrationInSeconds <= 0
        ? Date.now()
        : Date.now() + timeUntilMigrationInSeconds * 1000;
    return targetTimestamp;
  }, [selectedStakingContractDetails]);

  return (
    <Flex vertical gap={16}>
      <CooldownExplanation />
      <div>
        <Paragraph className="mb-4 text-sm" strong>
          When can I switch the staking contract?
        </Paragraph>
        <Flex align="center" gap={4}>
          <Text className="text-sm">You&apos;ll be able to switch in </Text>
          <Countdown
            value={timeUntilMigration}
            valueStyle={{
              fontSize: 14,
            }}
          />
        </Flex>
      </div>
    </Flex>
  );
};

export const CooldownContentTooltip = ({
  children,
}: {
  children: React.ReactNode;
}) => (
  <Tooltip
    trigger="hover"
    placement="top"
    title={CooldownPeriodContent}
    arrow={false}
    overlayStyle={overlayStyle}
    overlayInnerStyle={overlayInnerStyle}
  >
    {children}
  </Tooltip>
);
