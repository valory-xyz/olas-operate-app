import { WifiOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { PropsWithChildren, useEffect } from 'react';
import styled, { css } from 'styled-components';

import { COLOR } from '@/constants/colors';
import { APP_HEIGHT, APP_WIDTH, TOP_BAR_HEIGHT } from '@/constants/width';
import { useNotifyOnNewEpoch } from '@/hooks/useNotifyOnNewEpoch';
import { useOnlineStatusContext } from '@/hooks/useOnlineStatus';

import { NavBar } from './NavBar';

const Container = styled.div<{ $blur: boolean }>`
  background-color: ${COLOR.BACKGROUND};
  border-radius: 8px;

  height: ${APP_HEIGHT}px;
  /* width: ${APP_WIDTH}px; */

  display: flex;
  flex-direction: column;

  ${(props) =>
    props.$blur &&
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
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: ${TOP_BAR_HEIGHT}px 0;
  height: calc(${APP_HEIGHT}px - ${2 * TOP_BAR_HEIGHT}px);
`;

const useSystemLevelNotifications = () => {
  useNotifyOnNewEpoch();
};

export const Layout = ({ children }: PropsWithChildren) => {
  const { isOnline } = useOnlineStatusContext();

  // all the app level notifications
  useSystemLevelNotifications();

  useEffect(() => {
    const onlineStatusMessageKey = 'online-status-message';
    if (!isOnline) {
      message.error({
        content: 'Network connection is unstable',
        duration: 0,
        icon: <WifiOutlined />,
        key: onlineStatusMessageKey,
      });
    } else {
      message.destroy(onlineStatusMessageKey);
    }
  }, [isOnline]);

  return (
    <Container $blur={!isOnline}>
      <NavBar />
      <Body>{children}</Body>
    </Container>
  );
};
