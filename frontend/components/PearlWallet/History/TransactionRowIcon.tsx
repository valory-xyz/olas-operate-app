import {
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ArrowUpOutlined,
  CheckOutlined,
  LockOutlined,
  UnlockOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { ReactNode } from 'react';
import styled from 'styled-components';

import { COLOR } from '@/constants';
import { FUNDS_CATEGORY, FundsCategory } from '@/types/TransactionHistory';

const Wrapper = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
`;

const Circle = styled.span<{ $background: string; $color: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${({ $background }) => $background};
  color: ${({ $color }) => $color};
  font-size: 14px;
`;

type Direction = 'in' | 'out';

const DIRECTION_BY_CATEGORY: Record<FundsCategory, Direction> = {
  [FUNDS_CATEGORY.SAFE_DEPLOYED]: 'in',
  [FUNDS_CATEGORY.OPENING_BALANCE]: 'in',
  [FUNDS_CATEGORY.SAFE_SETUP_TRANSFER]: 'in',
  [FUNDS_CATEGORY.MASTER_FUNDING_IN]: 'in',
  [FUNDS_CATEGORY.AGENT_TO_MASTER]: 'in',
  [FUNDS_CATEGORY.SERVICE_BOND_REFUND]: 'in',
  [FUNDS_CATEGORY.UNSTAKE_REWARD]: 'in',
  [FUNDS_CATEGORY.STAKING_REWARD_CLAIM]: 'in',
  [FUNDS_CATEGORY.APP_TO_AGENT]: 'in',
  [FUNDS_CATEGORY.MASTER_WITHDRAWAL]: 'out',
  [FUNDS_CATEGORY.MASTER_TO_AGENT]: 'out',
  [FUNDS_CATEGORY.SERVICE_BOND_DEPOSIT]: 'out',
  [FUNDS_CATEGORY.AGENT_TO_APP]: 'out',
  [FUNDS_CATEGORY.SERVICE_EVICTED]: 'out',
  [FUNDS_CATEGORY.OTHER]: 'out',
};

const INNER_ICON_BY_CATEGORY: Record<FundsCategory, ReactNode> = {
  [FUNDS_CATEGORY.SAFE_DEPLOYED]: <CheckOutlined />,
  [FUNDS_CATEGORY.OPENING_BALANCE]: <WalletOutlined />,
  [FUNDS_CATEGORY.SAFE_SETUP_TRANSFER]: <ArrowDownOutlined />,
  [FUNDS_CATEGORY.MASTER_FUNDING_IN]: <ArrowDownOutlined />,
  [FUNDS_CATEGORY.AGENT_TO_MASTER]: <ArrowLeftOutlined />,
  [FUNDS_CATEGORY.SERVICE_BOND_REFUND]: <UnlockOutlined />,
  [FUNDS_CATEGORY.UNSTAKE_REWARD]: <UnlockOutlined />,
  [FUNDS_CATEGORY.STAKING_REWARD_CLAIM]: <ArrowDownOutlined />,
  [FUNDS_CATEGORY.APP_TO_AGENT]: <ArrowDownOutlined />,
  [FUNDS_CATEGORY.MASTER_WITHDRAWAL]: <ArrowUpOutlined />,
  [FUNDS_CATEGORY.MASTER_TO_AGENT]: <ArrowRightOutlined />,
  [FUNDS_CATEGORY.SERVICE_BOND_DEPOSIT]: <LockOutlined />,
  [FUNDS_CATEGORY.AGENT_TO_APP]: <ArrowUpOutlined />,
  [FUNDS_CATEGORY.SERVICE_EVICTED]: <ArrowUpOutlined />,
  [FUNDS_CATEGORY.OTHER]: <ArrowUpOutlined />,
};

const IN_COLORS = {
  background: COLOR.BG.SUCCESS.DEFAULT,
  color: COLOR.TEXT_COLOR.SUCCESS.DEFAULT,
};
const OUT_COLORS = {
  background: COLOR.GRAY_1,
  color: COLOR.TEXT_NEUTRAL_SECONDARY,
};

export const TransactionRowIcon = ({
  category,
}: {
  category: FundsCategory;
}) => {
  const direction = DIRECTION_BY_CATEGORY[category];
  const palette = direction === 'in' ? IN_COLORS : OUT_COLORS;
  return (
    <Wrapper>
      <Circle $background={palette.background} $color={palette.color}>
        {INNER_ICON_BY_CATEGORY[category]}
      </Circle>
    </Wrapper>
  );
};
