import { fireEvent, render, screen } from '@testing-library/react';

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
  Alert: ({
    message,
    type,
    action,
  }: {
    message: string;
    type: string;
    action?: React.ReactNode;
  }) => (
    <div data-testid={`alert-${type}`}>
      {message}
      {action}
    </div>
  ),
  MainContentContainer: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const mockUseStakingContracts = useStakingContracts as jest.MockedFunction<
  typeof useStakingContracts
>;

const mockRetry = jest.fn();

const setup = ({
  orderedStakingProgramIds = [] as string[],
  isStakingContractsLoaded = true,
  isStakingContractsError = false,
} = {}) => {
  mockUseStakingContracts.mockReturnValue({
    currentStakingProgramId: null,
    orderedStakingProgramIds,
    isStakingContractsLoaded,
    isStakingContractsError,
    retryStakingContracts: mockRetry,
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
    expect(screen.getByTestId('alert-info')).toHaveTextContent(
      'No compatible staking contracts are available for this agent yet.',
    );
  });

  it('shows nothing while the compatible list is still loading', () => {
    setup({ orderedStakingProgramIds: [], isStakingContractsLoaded: false });
    expect(screen.queryByTestId('alert-info')).not.toBeInTheDocument();
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
    expect(screen.queryByTestId('alert-info')).not.toBeInTheDocument();
  });

  it('shows an error alert with a working Retry when the multisig type could not be verified', () => {
    setup({ isStakingContractsError: true });
    expect(screen.getByTestId('alert-error')).toHaveTextContent(
      'Could not verify which staking contracts your agent can use.',
    );
    expect(screen.queryByTestId('alert-info')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  // Review regression: the alert and the cards must agree within a single
  // committed frame — no empty-state flash on first load, and no alert above
  // a still-populated list when the compatible set collapses.
  it('does not flash the empty-state alert on the first loaded render with a non-empty list', () => {
    setup({ orderedStakingProgramIds: [DEFAULT_STAKING_PROGRAM_ID] });
    expect(screen.queryByTestId('alert-info')).not.toBeInTheDocument();
    expect(
      screen.getByTestId(`card-${DEFAULT_STAKING_PROGRAM_ID}`),
    ).toBeInTheDocument();
  });

  it('removes the cards in the same render that shows the empty-state alert', () => {
    const { rerender } = setup({
      orderedStakingProgramIds: [DEFAULT_STAKING_PROGRAM_ID],
    });
    mockUseStakingContracts.mockReturnValue({
      currentStakingProgramId: null,
      orderedStakingProgramIds: [],
      isStakingContractsLoaded: true,
      isStakingContractsError: false,
      retryStakingContracts: mockRetry,
    } as ReturnType<typeof useStakingContracts>);
    rerender(
      <SelectActivityRewardsConfiguration
        mode="onboard"
        currentStakingProgramId={null}
      />,
    );
    expect(screen.getByTestId('alert-info')).toBeInTheDocument();
    expect(
      screen.queryByTestId(`card-${DEFAULT_STAKING_PROGRAM_ID}`),
    ).not.toBeInTheDocument();
  });

  it('keeps the existing card order when the same ids arrive re-sorted', () => {
    const { rerender } = setup({
      orderedStakingProgramIds: [
        DEFAULT_STAKING_PROGRAM_ID,
        SECOND_STAKING_PROGRAM_ID,
      ],
    });
    mockUseStakingContracts.mockReturnValue({
      currentStakingProgramId: SECOND_STAKING_PROGRAM_ID,
      orderedStakingProgramIds: [
        SECOND_STAKING_PROGRAM_ID,
        DEFAULT_STAKING_PROGRAM_ID,
      ],
      isStakingContractsLoaded: true,
      isStakingContractsError: false,
      retryStakingContracts: mockRetry,
    } as ReturnType<typeof useStakingContracts>);
    rerender(
      <SelectActivityRewardsConfiguration
        mode="onboard"
        currentStakingProgramId={SECOND_STAKING_PROGRAM_ID}
      />,
    );
    const cards = screen.getAllByTestId(/^card-/);
    expect(cards.map((el) => el.getAttribute('data-testid'))).toEqual([
      `card-${DEFAULT_STAKING_PROGRAM_ID}`,
      `card-${SECOND_STAKING_PROGRAM_ID}`,
    ]);
  });
});
