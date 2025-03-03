import { WifiOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { PropsWithChildren, useEffect } from 'react';
import styled, { css } from 'styled-components';

import { COLOR } from '@/constants/colors';
import { APP_HEIGHT } from '@/constants/width';
import { useNotifyOnNewEpoch } from '@/hooks/useNotifyOnNewEpoch';
import { useOnlineStatusContext } from '@/hooks/useOnlineStatus';

import { TopBar } from './TopBar';

const Container = styled.div<{ $blur: boolean }>`
  background-color: ${COLOR.WHITE};
  border-radius: 8px;

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
  max-height: calc(${APP_HEIGHT}px - 45px);
  padding-top: 45px;
  overflow-y: auto;
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
      <TopBar />
      <Body>{children}</Body>
    </Container>
  );
};
