import { ReactNode } from 'react';
import styled from 'styled-components';

import { COLOR } from '@/constants/colors';

const BalanceBreakdownLine = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  color: ${COLOR.TEXT};

  > * {
    background: ${COLOR.WHITE};
    z-index: 1;
    &:first-child {
      padding-right: 6px;
    }
    &:last-child {
      padding-left: 6px;
    }
  }

  &:before {
    content: '';
    position: absolute;
    bottom: 50%;
    width: 100%;
    border-bottom: 2px dotted ${COLOR.BORDER_GRAY};
    transform: translate(0%, 50%);
  }

  &:not(:last-child) {
    margin-bottom: 8px;
  }
`;

type InfoBreakdownProps = { left: ReactNode; right: ReactNode };
export const InfoBreakdown = ({ left, right }: InfoBreakdownProps) => {
  return (
    <BalanceBreakdownLine>
      {left}
      {right}
    </BalanceBreakdownLine>
  );
};
