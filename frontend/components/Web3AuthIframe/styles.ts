import styled from 'styled-components';

import { APP_HEIGHT, IFRAME_WIDTH } from '@/constants';

export const IframeContainer = styled.div`
  position: relative;
  width: ${IFRAME_WIDTH}px;
  height: calc(${APP_HEIGHT}px - 45px);
  overflow: hidden;
`;

export const Iframe = styled.iframe`
  position: absolute;
  width: 100%;
  height: 100%;
  border: none;
  z-index: 20;
`;

export const SpinnerOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
`;
