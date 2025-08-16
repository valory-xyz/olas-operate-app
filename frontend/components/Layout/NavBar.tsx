import { Flex, Image, Typography } from 'antd';
import styled from 'styled-components';

import { TOP_BAR_HEIGHT } from '@/constants/width';
import { useElectronApi } from '@/hooks/useElectronApi';

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

const PearlHeaderContainer = styled(Flex)`
  display: none; // TODO: show only for onboarding pages
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
`;

const PearHeader = () => (
  <PearlHeaderContainer justify="center" align="center" gap={8}>
    <Image
      src="/onboarding-robot.svg"
      alt="logo"
      width={24}
      height={24}
      style={{ marginTop: -2 }}
    />
    <Text>Pearl</Text>
  </PearlHeaderContainer>
);

export const NavBar = () => {
  const electronApi = useElectronApi();

  return (
    <TopBarContainer>
      <TrafficLights>
        <RedLight onClick={() => electronApi?.closeApp?.()} />
        <YellowLight onClick={() => electronApi?.minimizeApp?.()} />
        <DisabledLight />
      </TrafficLights>

      <PearHeader />
    </TopBarContainer>
  );
};
