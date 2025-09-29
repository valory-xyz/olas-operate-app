import { QuestionCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';
import { useRouter } from 'next/router';
import { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { COLOR } from '@/constants/colors';
import { Pages } from '@/enums/Pages';
import { useElectronApi } from '@/hooks/useElectronApi';
import { usePageState } from '@/hooks/usePageState';
import { useStore } from '@/hooks/useStore';

const { Text } = Typography;

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
  margin-right: 24px;
  -webkit-app-region: no-drag;
`;

const TopBarContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1;
  height: 45px;
  display: flex;
  align-items: center;
  padding: 0px 24px;
  border-radius: 8px 8px 0 0px;
  border-bottom: 1px solid ${COLOR.BORDER_GRAY};
  background: ${COLOR.WHITE};
  -webkit-app-region: drag;
`;

export const TopBar = () => {
  const router = useRouter();
  const {
    closeApp,
    minimizeApp,
    onRampWindow,
    web3AuthWindow,
    termsAndConditionsWindow,
  } = useElectronApi();
  const store = useStore();
  const { isUserLoggedIn, goto, pageState } = usePageState();

  const envName = store?.storeState?.environmentName;
  const isOnRamp = router.pathname === '/onramp';
  const isWeb3Auth = router.pathname === '/web3auth';
  const isTerms = router.pathname === '/terms-and-conditions';
  const isNotMain = [isOnRamp, isWeb3Auth, isTerms].some(Boolean);

  const name = useMemo(() => {
    if (isOnRamp) return 'Buy Crypto on Transak';
    if (isWeb3Auth) return 'Web3auth';
    if (isTerms) return 'Terms & Conditions';
    return `Pearl (beta) ${envName ? `(${envName})` : ''}`.trim();
  }, [isOnRamp, isWeb3Auth, isTerms, envName]);

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

      <Text>{name}</Text>

      {/* for now, showing only on Main page */}
      {isUserLoggedIn && pageState === Pages.Main && (
        <Flex align="center" className="ml-auto">
          <Button
            type="text"
            shape="circle"
            icon={<QuestionCircleOutlined />}
            onClick={() => goto(Pages.HelpAndSupport)}
          />
          <Button
            type="text"
            shape="circle"
            icon={<SettingOutlined />}
            onClick={() => goto(Pages.Settings)}
          />
        </Flex>
      )}
    </TopBarContainer>
  );
};
