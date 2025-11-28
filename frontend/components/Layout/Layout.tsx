import { message } from 'antd';
import Image from 'next/image';
import { PropsWithChildren, useEffect, useMemo, useRef } from 'react';
import styled, { css } from 'styled-components';

import {
  APP_HEIGHT,
  APP_WIDTH,
  COLOR,
  PAGES,
  SETUP_SCREEN,
  SetupScreen,
  SIDER_WIDTH,
  TOP_BAR_HEIGHT,
} from '@/constants';
import { useOnlineStatusContext, usePageState, useSetup } from '@/hooks';

import { Modal } from '../ui';
import { WindowControls } from './WindowControls';

const useScrollToTop = () => {
  const { state: setupState } = useSetup();
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (setupState === SETUP_SCREEN.SelectStaking) {
      bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [bodyRef, setupState]);

  return bodyRef;
};

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

const DraggableNavBar = styled.div<{ $isFullWidth: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1;
  width: ${(props) => (props.$isFullWidth ? '100%' : `${SIDER_WIDTH}px`)};
  height: ${TOP_BAR_HEIGHT}px;
  display: flex;
  align-items: center;
  -webkit-app-region: drag;
`;

const layoutWithFullHeight: SetupScreen[] = [SETUP_SCREEN.SetupYourAgent];

const Body = styled.div<{ $hasPadding?: boolean }>`
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: ${(props) => (props.$hasPadding ? '48px 0' : undefined)};
  height: ${APP_HEIGHT}px;
`;

export const Layout = ({ children }: PropsWithChildren) => {
  const { isOnline } = useOnlineStatusContext();
  const { state } = useSetup();
  const { pageState } = usePageState();
  const bodyRef = useScrollToTop();

  useEffect(() => {
    const onlineStatusMessageKey = 'online-status-message';
    if (isOnline) {
      message.destroy(onlineStatusMessageKey);
    }
  }, [isOnline]);

  const hasPadding = useMemo(() => {
    if (pageState === PAGES.Setup) {
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
        <DraggableNavBar $isFullWidth={pageState === PAGES.Setup}>
          <WindowControls />
        </DraggableNavBar>
        <Body $hasPadding={hasPadding} ref={bodyRef}>
          {children}
        </Body>
      </Container>
    </>
  );
};
