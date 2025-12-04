import { styled } from 'styled-components';

import { COLOR } from '@/constants/colors';

import { CardFlex } from '../ui';

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
