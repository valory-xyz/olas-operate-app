import { message } from 'antd';
import Image from 'next/image';
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

import { Modal } from '../ui';
import { NavBar } from './NavBar';

const Container = styled.div<{ $blur: boolean }>`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  max-width: ${APP_WIDTH}px;
  max-height: ${APP_HEIGHT}px;
  background-color: ${COLOR.GRAY_1};
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

const layoutWithFullHeight: SetupScreen[] = [SetupScreen.SetupYourAgent];

const Body = styled.div<{ $hasPadding?: boolean }>`
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: ${(props) => (props.$hasPadding ? '48px 0' : undefined)};
  height: ${APP_HEIGHT}px;
`;

const useSystemLevelNotifications = () => {
  useNotifyOnNewEpoch();
};

export const Layout = ({ children }: PropsWithChildren) => {
  const { isOnline } = useOnlineStatusContext();
  const { state } = useSetup();
  const { pageState } = usePageState();

  // All the app-level notifications
  useSystemLevelNotifications();

  useEffect(() => {
    const onlineStatusMessageKey = 'online-status-message';
    if (isOnline) {
      message.destroy(onlineStatusMessageKey);
    }
  }, [isOnline]);

  const hasPadding = useMemo(() => {
    if (pageState === Pages.Setup) {
      return layoutWithFullHeight.includes(state) ? false : true;
    }

    return false;
  }, [pageState, state]);

  return (
    <>
      {!isOnline && (
        <Modal
          open
          footer={null}
          closable={false}
          title={'No Internet Connection'}
          description={
            'Check your Wi-Fi or Ethernet. Pearl will reconnect automatically once the connection is stable.'
          }
          header={
            <Image
              src="/not-online.png"
              alt="No internet connection"
              width={80}
              height={80}
            />
          }
        />
      )}

      <Container $blur={!isOnline}>
        <NavBar />
        <Body $hasPadding={hasPadding}>{children}</Body>
      </Container>
    </>
  );
};
