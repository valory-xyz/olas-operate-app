import { QuestionCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';
import { useRouter } from 'next/router';
import { useMemo } from 'react';
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
  const electronApi = useElectronApi();
  const store = useStore();
  const { isUserLoggedIn, goto, pageState } = usePageState();

  const envName = store?.storeState?.environmentName;
  const currentPage = router.pathname;

  const isOnRamp = currentPage === '/onramp';
  const isNotMain = [isOnRamp].some(Boolean);

  const name = useMemo(() => {
    if (isOnRamp) return 'Buy Crypto on Transak';
    return `Pearl (beta) ${envName ? `(${envName})` : ''}`.trim();
  }, [isOnRamp, envName]);

  return (
    <TopBarContainer>
      {!isNotMain && (
        <TrafficLights>
          <RedLight onClick={() => electronApi?.closeApp?.()} />
          <YellowLight onClick={() => electronApi?.minimizeApp?.()} />
          <DisabledLight />
        </TrafficLights>
      )}

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
