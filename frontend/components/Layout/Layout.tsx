import { WifiOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { PropsWithChildren, useEffect, useMemo } from 'react';
import styled, { css } from 'styled-components';

import { COLOR } from '@/constants/colors';
import { APP_HEIGHT, APP_WIDTH } from '@/constants/width';
import { Pages } from '@/enums/Pages';
import { SetupScreen } from '@/enums/SetupScreen';
import { useNotifyOnNewEpoch } from '@/hooks/useNotifyOnNewEpoch';
import { useOnlineStatusContext } from '@/hooks/useOnlineStatus';
import { usePageState } from '@/hooks/usePageState';
import { useSetup } from '@/hooks/useSetup';

import { NavBar } from './NavBar';

const Container = styled.div<{ $blur: boolean }>`
  display: flex;
  flex-direction: column;
  height: ${APP_HEIGHT}px;
  width: ${APP_WIDTH}px;
  background-color: ${COLOR.BACKGROUND};
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

const Body = styled.div<{ $hasPadding?: boolean }>`
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: ${(props) => (props.$hasPadding ? '40px 0' : undefined)};
  height: ${APP_HEIGHT}px;
`;

const useSystemLevelNotifications = () => {
  useNotifyOnNewEpoch();
};

export const Layout = ({ children }: PropsWithChildren) => {
  const { isOnline } = useOnlineStatusContext();
  const { state } = useSetup();
  const { pageState } = usePageState();

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

  const hasPadding = useMemo(() => {
    if (pageState === Pages.Setup) {
      if (state === SetupScreen.SetupYourAgent) {
        return false;
      }
      return true;
    }

    return false;
  }, [pageState, state]);

  return (
    <Container $blur={!isOnline}>
      <NavBar />
      <Body $hasPadding={hasPadding}>{children}</Body>
    </Container>
  );
};
