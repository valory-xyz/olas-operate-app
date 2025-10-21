import { useRouter } from 'next/router';
import { useCallback } from 'react';
import styled from 'styled-components';

import { SIDER_WIDTH, TOP_BAR_HEIGHT } from '@/constants/width';
import { Pages } from '@/enums';
import { usePageState } from '@/hooks';
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

const SiderDraggableTopBar = styled.div<{ $isFullWidth: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1;
  width: ${(props) => (props.$isFullWidth ? '100%' : `${SIDER_WIDTH}px`)};
  height: ${TOP_BAR_HEIGHT}px;
  display: flex;
  align-items: center;
  -webkit-app-region: drag;
`;

export const NavBar = () => {
  const router = useRouter();
  const { pageState } = usePageState();

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
    <SiderDraggableTopBar $isFullWidth={pageState === Pages.Setup}>
      <TrafficLights>
        <RedLight onClick={handleClose} />
        {isNotMain ? (
          <DisabledLight />
        ) : (
          <YellowLight onClick={() => minimizeApp?.()} />
        )}
        <DisabledLight />
      </TrafficLights>
    </SiderDraggableTopBar>
  );
};
