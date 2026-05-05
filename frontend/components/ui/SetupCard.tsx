import styled from 'styled-components';

import { COLOR } from '@/constants';

export const SetupCard = styled.div<{ $maxWidth?: number }>`
  max-width: ${({ $maxWidth }) => ($maxWidth ? `${$maxWidth}px` : '516px')};
  width: 100%;
  margin: auto;
  border-radius: 16px;
  background: ${COLOR.WHITE};
  box-shadow:
    0 74px 21px 0 rgba(170, 193, 203, 0),
    0 47px 19px 0 rgba(170, 193, 203, 0.01),
    0 26px 16px 0 rgba(170, 193, 203, 0.05),
    0 12px 12px 0 rgba(170, 193, 203, 0.09),
    0 3px 6px 0 rgba(170, 193, 203, 0.1);
`;
