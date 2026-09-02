import { render, screen } from '@testing-library/react';

import { SelectActivityRewardsConfiguration } from '../../../components/SelectStakingPage/components/SelectActivityRewardsConfiguration';
import { useStakingContracts } from '../../../hooks';
import {
  DEFAULT_STAKING_PROGRAM_ID,
  SECOND_STAKING_PROGRAM_ID,
} from '../../helpers/factories';

jest.mock('../../../hooks', () => ({
  usePageState: jest.fn(() => ({ goto: jest.fn() })),
  useStakingContracts: jest.fn(),
  useStakingContractDetails: jest.fn(() => ({
    stakingContractInfo: undefined,
    isRewardsAvailable: true,
  })),
  useStakingProgram: jest.fn(() => ({})),
}));

jest.mock('../../../components/StakingContractCard', () => ({
  StakingContractCard: ({ stakingProgramId }: { stakingProgramId: string }) => (
    <div data-testid={`card-${stakingProgramId}`} />
  ),
}));

jest.mock(
  '../../../components/SelectStakingPage/components/SelectStakingButton',
  () => ({ SelectStakingButton: () => null }),
);

jest.mock('../../../components/SelectStakingPage/hooks/useCanMigrate', () => ({
  MigrateButtonText: {},
  useCanMigrate: jest.fn(() => ({ canMigrate: true, buttonText: 'Select' })),
}));

jest.mock('../../../components/NoStakingRewardsAlert', () => ({
  NoStakingRewardsAlert: () => null,
}));

jest.mock('../../../components/ui', () => ({
  Alert: ({ message }: { message: string }) => (
    <div data-testid="empty-alert">{message}</div>
  ),
  MainContentContainer: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const mockUseStakingContracts = useStakingContracts as jest.MockedFunction<
  typeof useStakingContracts
>;

const setup = ({
  orderedStakingProgramIds = [] as string[],
  isStakingContractsLoaded = true,
} = {}) => {
  mockUseStakingContracts.mockReturnValue({
    currentStakingProgramId: null,
    orderedStakingProgramIds,
    isStakingContractsLoaded,
  } as ReturnType<typeof useStakingContracts>);
  return render(
    <SelectActivityRewardsConfiguration
      mode="onboard"
      currentStakingProgramId={null}
    />,
  );
};

describe('SelectActivityRewardsConfiguration — empty state (OPE-1919)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows an info alert when no contract is compatible with the service', () => {
    setup({ orderedStakingProgramIds: [], isStakingContractsLoaded: true });
    expect(screen.getByTestId('empty-alert')).toHaveTextContent(
      'No compatible staking contracts are available for this agent yet.',
    );
  });

  it('shows nothing while the compatible list is still loading', () => {
    setup({ orderedStakingProgramIds: [], isStakingContractsLoaded: false });
    expect(screen.queryByTestId('empty-alert')).not.toBeInTheDocument();
  });

  it('renders a card per compatible contract and no alert', () => {
    setup({
      orderedStakingProgramIds: [
        DEFAULT_STAKING_PROGRAM_ID,
        SECOND_STAKING_PROGRAM_ID,
      ],
    });
    expect(
      screen.getByTestId(`card-${DEFAULT_STAKING_PROGRAM_ID}`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`card-${SECOND_STAKING_PROGRAM_ID}`),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('empty-alert')).not.toBeInTheDocument();
  });
});
