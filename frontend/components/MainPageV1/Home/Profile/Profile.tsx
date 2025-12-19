import { Flex, Spin, Typography } from 'antd';
import styled from 'styled-components';

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
  const { deploymentDetails } = useServices();

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
      <Iframe src="http://127.0.0.1:8716" id="agent-ui" allow="popups" />
    </Container>
  );
};
