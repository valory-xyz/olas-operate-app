import { WifiOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { PropsWithChildren, useContext, useEffect } from 'react';
import styled, { css } from 'styled-components';

import { COLOR } from '@/constants/colors';
import { OnlineStatusContext } from '@/context/OnlineStatusProvider';
import { useNotifyOnNewEpoch } from '@/hooks/useNotifyOnNewEpoch';

import { TopBar } from './TopBar';

const Container = styled.div<{ blur: 'true' | 'false' }>`
  background-color: ${COLOR.WHITE};
  border-radius: 8px;

  ${(props) =>
    props.blur === 'true' &&
    css`
      filter: blur(2px);
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(27, 38, 50, 0.1);
        z-index: 1;
      }
    `}
`;

const Body = styled.div`
  // check main.js for the height of the app ie, 700px
  max-height: calc(700px - 45px);
  padding-top: 45px;
  overflow-y: auto;
`;

const useSystemLevelNotifications = () => {
  useNotifyOnNewEpoch();
};

export const Layout = ({
  children,
}: PropsWithChildren & { vertical?: boolean }) => {
  const { isOnline } = useContext(OnlineStatusContext);

  // all the app level notifications
  useSystemLevelNotifications();

  useEffect(() => {
    let messageKey;
    if (!isOnline) {
      messageKey = message.error({
        content: 'Network connection is unstable',
        duration: 0,
        icon: <WifiOutlined />,
      });
    } else {
      message.destroy(messageKey);
    }
  }, [isOnline]);

  return (
    <Container blur={isOnline ? 'false' : 'true'}>
      <TopBar />
      <Body>{children}</Body>
    </Container>
  );
};
