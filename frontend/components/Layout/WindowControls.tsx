import { useRouter } from 'next/router';
import { useCallback } from 'react';
import styled from 'styled-components';

import { useElectronApi } from '@/hooks/useElectronApi';

const TrafficLightIcon = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  -webkit-app-region: no-drag;
`;

const RedLight = styled(TrafficLightIcon)`
  background-color: #fe5f57;
`;

const YellowLight = styled(TrafficLightIcon)`
  background-color: #febc2e;
`;

const DisabledLight = styled(TrafficLightIcon)`
  background-color: #ddd;
`;

const WindowControlsContainer = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  padding-left: 20px;
  -webkit-app-region: no-drag;
`;

export const WindowControls = () => {
  const router = useRouter();
  const {
    closeApp,
    minimizeApp,
    onRampWindow,
    web3AuthWindow,
    termsAndConditionsWindow,
  } = useElectronApi();
  const isOnRamp = router.pathname === '/onramp';
  const isWeb3Auth = router.pathname === '/web3auth';
  const isTerms = router.pathname === '/terms-and-conditions';
  const isNotMain = [isOnRamp, isWeb3Auth, isTerms].some(Boolean);

  const handleClose = useCallback(() => {
    if (isOnRamp) {
      onRampWindow?.close?.();
      return;
    }

    if (isTerms) {
      termsAndConditionsWindow?.close?.();
      return;
    }

    if (isWeb3Auth) {
      web3AuthWindow?.close?.();
      return;
    }

    if (!closeApp) return;
    closeApp();
  }, [
    closeApp,
    isOnRamp,
    isTerms,
    isWeb3Auth,
    termsAndConditionsWindow,
    onRampWindow,
    web3AuthWindow,
  ]);

  return (
    <WindowControlsContainer>
      <RedLight onClick={handleClose} />
      {isNotMain ? (
        <DisabledLight />
      ) : (
        <YellowLight onClick={() => minimizeApp?.()} />
      )}
      <DisabledLight />
    </WindowControlsContainer>
  );
};
