import { Flex, Typography } from 'antd';
import { isNil } from 'lodash';
import { useState } from 'react';
import { useInterval } from 'usehooks-ts';

import { POPOVER_WIDTH_LARGE } from '@/constants/width';
import { StakingContractInfo } from '@/types/Autonolas';

const { Text } = Typography;

export const CountdownUntilMigration = ({
  activeStakingContractInfo,
}: {
  activeStakingContractInfo: Partial<StakingContractInfo>;
}) => {
  const [secondsUntilReady, setSecondsUntilMigration] = useState<number>();

  useInterval(() => {
    if (!activeStakingContractInfo) return;

    const { serviceStakingStartTime, minimumStakingDuration } =
      activeStakingContractInfo;

    if (isNil(minimumStakingDuration)) return;
    if (isNil(serviceStakingStartTime)) return;

    const now = Math.round(Date.now() / 1000);
    const timeSinceLastStaked = now - serviceStakingStartTime;

    const timeUntilMigration = minimumStakingDuration - timeSinceLastStaked;

    if (timeUntilMigration < 0) {
      setSecondsUntilMigration(0);
      return;
    }

    setSecondsUntilMigration(timeUntilMigration);
  }, 1000);

  const countdownDisplay = isNil(secondsUntilReady)
    ? 'Loading...'
    : countdownDisplayFormat(secondsUntilReady);

  return (
    <Flex vertical gap={1} style={{ maxWidth: POPOVER_WIDTH_LARGE }}>
      <Text strong>Can&apos;t switch because you unstaked too recently.</Text>
      <Text>This may be because your agent was suspended.</Text>
      <Text>Keep running your agent and you&apos;ll be able to switch in</Text>
      <Text>{countdownDisplay}</Text>
    </Flex>
  );
};

const countdownDisplayFormat = (totalSeconds: number) => {
  const days = Math.floor(totalSeconds / (24 * 3600));
  totalSeconds %= 24 * 3600;

  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  // Ensure double digits for hours, minutes, and seconds
  const formattedHours = String(hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');
  // TODO: update this support plural and singular text
  return `${days} days ${formattedHours} hours ${formattedMinutes} minutes ${formattedSeconds} seconds`;
};
