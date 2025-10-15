import { isNil } from 'lodash';
import { useState } from 'react';
import { useInterval } from 'usehooks-ts';

import {
  ServiceStakingDetails,
  StakingContractDetails,
} from '@/types/Autonolas';
import { Maybe } from '@/types/Util';
import { formatCountdownDisplay } from '@/utils/time';

export const useStakingContractCountdown = (
  currentStakingContractInfo: Maybe<
    Partial<StakingContractDetails & ServiceStakingDetails>
  >,
) => {
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
    : formatCountdownDisplay(secondsUntilReady);

  return { countdownDisplay, secondsUntilReady };
};
