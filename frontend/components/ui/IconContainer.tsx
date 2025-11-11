import styled from 'styled-components';

import { COLOR } from '@/constants';

export const IconContainer = styled.div`
  width: 36px;
  min-width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid ${COLOR.BORDER_GRAY};
  border-radius: 8px;
  background-image: url('/icon-bg.svg');
`;
