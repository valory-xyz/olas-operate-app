import { styled } from 'styled-components';

import { COLOR } from '@/constants/colors';

import { CardFlex } from '../ui';

export const IconContainer = styled.div`
  min-width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  align-self: center;
  justify-content: center;
  border: 1px solid ${COLOR.GRAY_3};
  border-radius: 8px;
  background-image: url('/icon-bg.svg');
`;

export const RecoveryMethodCard = styled(CardFlex)<{ width?: number }>`
  width: ${({ width }) => (width ? `${width}px` : '412px')};
  border-color: ${COLOR.WHITE};
  .ant-card-body {
    height: 100%;
  }
  .recovery-method-card-body {
    flex: 1;
  }
`;
