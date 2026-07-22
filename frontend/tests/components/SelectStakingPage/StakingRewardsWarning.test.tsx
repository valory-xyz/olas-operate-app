import { render, screen } from '@testing-library/react';

import { StakingRewardsWarning } from '../../../components/SelectStakingPage/components/SelectActivityRewardsConfiguration';
import { StakingProgramId } from '../../../constants';
import { useStakingContractDetails } from '../../../hooks';
import { makeStakingContractDetails } from '../../helpers/factories';

jest.mock('../../../hooks', () => ({
  useStakingContractDetails: jest.fn(),
}));

// Isolate the gating logic from the alert's markup.
jest.mock('../../../components/NoStakingRewardsAlert', () => ({
  NoStakingRewardsAlert: () => <div data-testid="no-rewards-alert" />,
}));

const mockUseStakingContractDetails =
  useStakingContractDetails as jest.MockedFunction<
    typeof useStakingContractDetails
  >;

const programId = 'pearl_beta_mech_marketplace_1' as StakingProgramId;

const setup = (
  value: Partial<ReturnType<typeof useStakingContractDetails>>,
) => {
  mockUseStakingContractDetails.mockReturnValue({
    stakingContractInfo: undefined,
    isRewardsAvailable: false,
    hasEnoughServiceSlots: false,
    hasEnoughRewardsAndSlots: false,
    ...value,
  });
  return render(<StakingRewardsWarning stakingProgramId={programId} />);
};

describe('StakingRewardsWarning', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders nothing while contract details are still loading', () => {
    // stakingContractInfo undefined => not loaded; must not flash the warning
    setup({ stakingContractInfo: undefined, isRewardsAvailable: false });
    expect(screen.queryByTestId('no-rewards-alert')).not.toBeInTheDocument();
  });

  it('renders nothing when rewards are available', () => {
    setup({
      stakingContractInfo: makeStakingContractDetails({ availableRewards: 10 }),
      isRewardsAvailable: true,
    });
    expect(screen.queryByTestId('no-rewards-alert')).not.toBeInTheDocument();
  });

  it('renders the warning when the reward pool is empty', () => {
    setup({
      stakingContractInfo: makeStakingContractDetails({ availableRewards: 0 }),
      isRewardsAvailable: false,
    });
    expect(screen.getByTestId('no-rewards-alert')).toBeInTheDocument();
  });
});
