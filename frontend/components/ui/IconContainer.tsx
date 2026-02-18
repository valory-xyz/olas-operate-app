import styled from 'styled-components';

import { COLOR } from '@/constants';

type IconContainerProps = {
  $size?: number;
  $borderWidth?: number;
};

export const IconContainer = styled.div<IconContainerProps>`
  min-width: ${({ $size = 36 }) => $size}px;
  height: ${({ $size = 36 }) => $size}px;
  display: flex;
  align-items: center;
  align-self: center;
  justify-content: center;
  border: ${({ $borderWidth = 1 }) => $borderWidth}px solid ${COLOR.GRAY_3};
  border-radius: 8px;
  background-image: url('/icon-bg.svg');
`;
