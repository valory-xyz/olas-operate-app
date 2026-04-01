import { render, screen } from '@testing-library/react';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../../mocks/styledComponents').styledComponentsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

// Import after mocks
import { RewardDot } from '../../../../components/MainPage/Sidebar/RewardDot';

describe('RewardDot', () => {
  it('renders with role="img"', () => {
    render(<RewardDot hasEarnedRewards={true} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('has aria-label "Earned rewards this cycle" when hasEarnedRewards is true', () => {
    render(<RewardDot hasEarnedRewards={true} />);
    expect(
      screen.getByRole('img', { name: 'Earned rewards this cycle' }),
    ).toBeInTheDocument();
  });

  it('has aria-label "No rewards earned this cycle" when hasEarnedRewards is false', () => {
    render(<RewardDot hasEarnedRewards={false} />);
    expect(
      screen.getByRole('img', { name: 'No rewards earned this cycle' }),
    ).toBeInTheDocument();
  });

  it('does not render a live region (role="status")', () => {
    render(<RewardDot hasEarnedRewards={true} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
