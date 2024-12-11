import { isNil } from 'lodash';
import { useState } from 'react';
import { useInterval } from 'usehooks-ts';

import {
  ServiceStakingDetails,
  StakingContractDetails,
} from '@/types/Autonolas';
import { Maybe } from '@/types/Util';

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

  const daysInWords = `${days} day${days !== 1 ? 's' : ''}`;
  const hoursInWords = `${formattedHours} hour${hours !== 1 ? 's' : ''}`;
  const minutesInWords = `${formattedMinutes} minute${minutes !== 1 ? 's' : ''}`;
  const secondsInWords = `${formattedSeconds} second${seconds !== 1 ? 's' : ''}`;
  return `${daysInWords} ${hoursInWords} ${minutesInWords} ${secondsInWords}`.trim();
};

export const useStakingContractCountdown = ({
  currentStakingContractInfo,
}: {
  currentStakingContractInfo: Maybe<
    Partial<StakingContractDetails & ServiceStakingDetails>
  >;
}) => {
  const [secondsUntilReady, setSecondsUntilMigration] = useState<number>();

  useInterval(() => {
    if (!currentStakingContractInfo) return;

    if (
      !('serviceStakingStartTime' in currentStakingContractInfo) ||
      !('minimumStakingDuration' in currentStakingContractInfo)
    ) {
      return;
    }

    const { serviceStakingStartTime, minimumStakingDuration } =
      currentStakingContractInfo;

    if (isNil(minimumStakingDuration) || isNil(serviceStakingStartTime)) return;

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

  return countdownDisplay;
};
