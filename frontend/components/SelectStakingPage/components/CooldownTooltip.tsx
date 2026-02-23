import { Flex, Statistic, Typography } from 'antd';
import { isNil } from 'lodash';
import { type CSSProperties, ReactNode, useMemo } from 'react';
import styled from 'styled-components';

import { Tooltip } from '@/components/ui';
import { COLOR } from '@/constants';
import { useActiveStakingContractDetails } from '@/hooks';

const { Text, Paragraph } = Typography;
const { Timer: AntdTimer } = Statistic;

const Timer = styled(AntdTimer)`
  &.ant-statistic,
  .ant-statistic-content {
    display: inline;
  }
`;

const overlayStyle: CSSProperties = {
  maxWidth: 368,
} as const;

const overlayInnerStyle: CSSProperties = {
  padding: 16,
  borderRadius: 16,
  backgroundColor: COLOR.WHITE,
} as const;

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
        <Text className="text-sm">
          You&apos;ll be able to switch in{' '}
          <Timer
            type="countdown"
            value={timeUntilMigration}
            valueStyle={{
              fontSize: 14,
            }}
            format={'D[d] HH[h] mm[m] ss[s.]'}
          />
        </Text>
      </div>
    </Flex>
  );
};

type CooldownContentTooltipProps = { children: ReactNode };

export const CooldownContentTooltip = ({
  children,
}: CooldownContentTooltipProps) => (
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
