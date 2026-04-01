import React from 'react';
import styled from 'styled-components';

import { COLOR } from '@/constants';

const DOT_SIZE = 8;

const Dot = styled.span<{ $hasEarnedRewards: boolean }>`
  display: inline-block;
  width: ${DOT_SIZE}px;
  height: ${DOT_SIZE}px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $hasEarnedRewards }) =>
    $hasEarnedRewards ? COLOR.SUCCESS : COLOR.GRAY_3};
`;

const VisuallyHidden = styled.span`
  border: 0;
  clip: rect(0 0 0 0);
  height: 1px;
  width: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
`;

type RewardDotProps = {
  hasEarnedRewards: boolean;
};

export const RewardDot = ({ hasEarnedRewards }: RewardDotProps) => (
  <span role="status">
    <VisuallyHidden>
      {hasEarnedRewards
        ? 'Earned rewards this cycle'
        : 'No rewards earned this cycle'}
    </VisuallyHidden>
    <Dot $hasEarnedRewards={hasEarnedRewards} aria-hidden="true" />
  </span>
);
