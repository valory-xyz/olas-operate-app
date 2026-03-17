import { Flex, Spin, Typography } from 'antd';
import styled from 'styled-components';

import { useElectronApi, useServices } from '@/hooks';

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

const IFRAME_SRC = 'http://127.0.0.1:8716';

export const Profile = () => {
  const { nextLogError } = useElectronApi();
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
      <Iframe
        src={IFRAME_SRC}
        id="agent-ui"
        allow="popups"
        onError={(e) => {
          const errorEvent = e.nativeEvent as ErrorEvent;
          const error = new Error(
            errorEvent.message || 'Agent UI iframe failed to load',
          );
          nextLogError?.(error, {
            errorInfo: `[Profile] Agent UI iframe failed to load from ${IFRAME_SRC}`,
          });
        }}
      />
    </Container>
  );
};
