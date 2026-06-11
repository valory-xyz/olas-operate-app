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

type Palette = { background: string; color: string };

const GREEN_COLORS: Palette = {
  background: COLOR.BG.SUCCESS.DEFAULT,
  color: COLOR.TEXT_COLOR.SUCCESS.DEFAULT,
};
const PURPLE_COLORS: Palette = {
  background: COLOR.PURPLE_LIGHT_3,
  color: COLOR.PURPLE,
};
const GRAY_COLORS: Palette = {
  background: COLOR.GRAY_1,
  color: COLOR.TEXT_NEUTRAL_SECONDARY,
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

const PALETTE_BY_CATEGORY: Record<FundsCategory, Palette> = {
  // Green — external funds into the wallet.
  [FUNDS_CATEGORY.MASTER_FUNDING_IN]: GREEN_COLORS,
  [FUNDS_CATEGORY.SAFE_SETUP_TRANSFER]: GREEN_COLORS,
  [FUNDS_CATEGORY.OPENING_BALANCE]: GREEN_COLORS,
  [FUNDS_CATEGORY.SAFE_DEPLOYED]: GREEN_COLORS,
  [FUNDS_CATEGORY.STAKING_REWARD_CLAIM]: GREEN_COLORS,
  [FUNDS_CATEGORY.APP_TO_AGENT]: GREEN_COLORS,
  // Purple — internal Master ↔ Agent / staking activity.
  [FUNDS_CATEGORY.AGENT_TO_MASTER]: PURPLE_COLORS,
  [FUNDS_CATEGORY.MASTER_TO_AGENT]: PURPLE_COLORS,
  [FUNDS_CATEGORY.SERVICE_BOND_DEPOSIT]: PURPLE_COLORS,
  [FUNDS_CATEGORY.AGENT_TO_APP]: PURPLE_COLORS,
  // Gray — exits / unwinds.
  [FUNDS_CATEGORY.MASTER_WITHDRAWAL]: GRAY_COLORS,
  [FUNDS_CATEGORY.SERVICE_BOND_REFUND]: GRAY_COLORS,
  [FUNDS_CATEGORY.UNSTAKE_REWARD]: GRAY_COLORS,
  [FUNDS_CATEGORY.SERVICE_EVICTED]: GRAY_COLORS,
  [FUNDS_CATEGORY.OTHER]: GRAY_COLORS,
};

export const TransactionRowIcon = ({
  category,
}: {
  category: FundsCategory;
}) => {
  const palette = PALETTE_BY_CATEGORY[category];
  return (
    <Wrapper>
      <Circle $background={palette.background} $color={palette.color}>
        {INNER_ICON_BY_CATEGORY[category]}
      </Circle>
    </Wrapper>
  );
};
