import { useRouter } from 'next/router';
import { useCallback } from 'react';
import styled from 'styled-components';

import { TOP_BAR_HEIGHT } from '@/constants/width';
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

const TrafficLights = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  padding-left: 20px;
  -webkit-app-region: no-drag;
`;

const TopBarContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1;
  height: ${TOP_BAR_HEIGHT}px;
  display: flex;
  align-items: center;
  -webkit-app-region: drag;
`;

export const NavBar = () => {
  const router = useRouter();
  const { closeApp, minimizeApp, onRampWindow } = useElectronApi();

  const isOnRamp = router.pathname === '/onramp';
  const isNotMain = [isOnRamp].some(Boolean);

  const handleClose = useCallback(() => {
    if (isOnRamp) {
      onRampWindow?.close?.();
      return;
    }

    if (!closeApp) return;
    closeApp();
  }, [closeApp, isOnRamp, onRampWindow]);

  return (
    <TopBarContainer>
      <TrafficLights>
        <RedLight onClick={handleClose} />
        {isNotMain ? (
          <DisabledLight />
        ) : (
          <YellowLight onClick={() => minimizeApp?.()} />
        )}
        <DisabledLight />
      </TrafficLights>
    </TopBarContainer>
  );
};
