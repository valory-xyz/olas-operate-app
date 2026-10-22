import { render, screen } from '@testing-library/react';
import React from 'react';

import { Streak } from '../../../../../../components/MainPage/Home/Overview/Staking/Streak';
import { useRewardContext } from '../../../../../../hooks';
import { useStakingDetails } from '../../../../../../hooks/useStakingDetails';

jest.mock('../../../../../../components/custom-icons', () => ({
  FireV1: () => <span>flame</span>,
}));
jest.mock('../../../../../../components/ui', () => ({
  useContentTransitionValue: <T,>(value: T) => value,
}));
jest.mock('../../../../../../hooks', () => ({
  useRewardContext: jest.fn(),
}));
jest.mock('../../../../../../hooks/useStakingDetails', () => ({
  useStakingDetails: jest.fn(),
}));

const getSkeleton = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('.ant-skeleton-input');

describe('Streak while loading', () => {
  beforeEach(() => {
    (useStakingDetails as jest.Mock).mockReturnValue({
      isStreakLoading: true,
      isStreakError: false,
      optimisticStreak: 0,
    });
    (useRewardContext as jest.Mock).mockReturnValue({
      isEpochTargetMet: false,
    });
  });

  it('keeps the compact skeleton to the width of the loaded streak', () => {
    const { container } = render(<Streak isCompact />);

    expect(getSkeleton(container)).toHaveStyle({
      width: '48px',
      minWidth: '48px',
    });
  });

  it("leaves the default skeleton at antd's own width", () => {
    const { container } = render(<Streak />);

    expect(getSkeleton(container)?.style.width).toBe('');
  });
});

describe('Streak with no streak', () => {
  beforeEach(() => {
    (useStakingDetails as jest.Mock).mockReturnValue({
      isStreakLoading: false,
      isStreakError: false,
      optimisticStreak: 0,
    });
    (useRewardContext as jest.Mock).mockReturnValue({
      isEpochTargetMet: false,
    });
  });

  it('shows 0 in the compact header', () => {
    render(<Streak isCompact />);

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.queryByText(/No streak/)).toBeNull();
  });

  it('keeps "No streak" by default', () => {
    render(<Streak />);

    expect(screen.getByText(/No streak/)).toBeInTheDocument();
  });
});
