import { useCallback } from 'react';

import { OnRamp } from '@/components/OnRamp';
import { SETUP_SCREEN } from '@/constants';
import { useSetup } from '@/hooks';

export const SetupOnRamp = () => {
  const { goto: gotoSetup, prevState } = useSetup();

  const handleBack = useCallback(() => {
    gotoSetup(prevState ?? SETUP_SCREEN.FundYourAgent);
  }, [gotoSetup, prevState]);

  return <OnRamp mode="onboard" handleBack={handleBack} />;
};
