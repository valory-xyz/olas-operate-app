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
    web3AuthSwapOwnerWindow,
  } = useElectronApi();
  const isOnRamp = router.pathname === '/onramp';
  const isWeb3Auth = router.pathname === '/web3auth';
  const isWeb3AuthSwapOwner = router.pathname === '/web3auth-swap-owner';
  const isNotMain = [isOnRamp, isWeb3Auth, isWeb3AuthSwapOwner].some(Boolean);

  const handleClose = useCallback(() => {
    if (isOnRamp) {
      onRampWindow?.close?.();
      return;
    }

    if (isWeb3Auth) {
      web3AuthWindow?.close?.();
      return;
    }

    if (isWeb3AuthSwapOwner) {
      web3AuthSwapOwnerWindow?.close?.();
      return;
    }

    if (!closeApp) return;
    closeApp();
  }, [
    closeApp,
    isOnRamp,
    isWeb3Auth,
    isWeb3AuthSwapOwner,
    onRampWindow,
    web3AuthWindow,
    web3AuthSwapOwnerWindow,
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
