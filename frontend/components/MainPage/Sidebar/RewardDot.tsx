import React from 'react';
import styled from 'styled-components';

import { COLOR } from '@/constants';

const DOT_SIZE = 8;

const Container = styled.span`
  display: grid;
  place-items: center;
  min-width: 24px;
`;

const Dot = styled.span<{ $hasEarnedRewards: boolean }>`
  display: inline-block;
  width: ${DOT_SIZE}px;
  height: ${DOT_SIZE}px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $hasEarnedRewards }) =>
    $hasEarnedRewards ? COLOR.SUCCESS : COLOR.GRAY_3};
`;

type RewardDotProps = {
  hasEarnedRewards: boolean;
};

export const RewardDot = ({ hasEarnedRewards }: RewardDotProps) => (
  <Container
    role="img"
    aria-label={
      hasEarnedRewards
        ? 'Earned rewards this cycle'
        : 'No rewards earned this cycle'
    }
  >
    <Dot $hasEarnedRewards={hasEarnedRewards} />
  </Container>
);
