import { Flex, Spin, Typography } from 'antd';
import styled from 'styled-components';

import { AgentMap } from '@/constants';
import { useServices } from '@/hooks';

const { Text } = Typography;

const Container = styled(Flex)`
  display: flex;
  flex: auto;
  text-align: center;
  margin-bottom: -32px;
  padding: 0 8px;
`;

const Iframe = styled.iframe`
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 8px;
`;

export const Profile = () => {
  const { deploymentDetails, selectedAgentType } = useServices();

  // TODO: temp, remove once they fix proxy
  const url =
    selectedAgentType === AgentMap.PettAi
      ? 'http://localhost:8716'
      : 'http://127.0.0.1:8716';

  // If agent healthcheck is not accessible yet, show loader
  if (Object.keys(deploymentDetails?.healthcheck || {}).length === 0) {
    return (
      <Container justify="center" align="center" vertical gap={24}>
        <Spin />
        <Text>
          Your agent is loading the latest data.
          <br />
          This may take a moment.
        </Text>
      </Container>
    );
  }
  return (
    <Container>
      <Iframe src={url} id="agent-ui" allow="popups" />
    </Container>
  );
};
