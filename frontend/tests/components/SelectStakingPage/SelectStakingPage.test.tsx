import { fireEvent, render, screen } from '@testing-library/react';

// Import AFTER mocks are declared so jest can intercept
import { SelectStakingPage } from '../../../components/SelectStakingPage';
import { ConfigureActivityRewards } from '../../../components/SelectStakingPage/components/ConfigureActivityRewards';
import { SelectActivityRewardsConfiguration } from '../../../components/SelectStakingPage/components/SelectActivityRewardsConfiguration';
import { BackButton } from '../../../components/ui/BackButton';
import { PAGES } from '../../../constants';
import {
  usePageState,
  useServices,
  useStakingContracts,
  useStakingProgram,
} from '../../../hooks';
import {
  DEFAULT_STAKING_PROGRAM_ID,
  makeService,
  SECOND_STAKING_PROGRAM_ID,
} from '../../helpers/factories';

// Child components are mocked to expose backButton + action callbacks without
// pulling in Ant Design / staking-contract data dependencies.
jest.mock(
  '../../../components/SelectStakingPage/components/ConfigureActivityRewards',
  () => ({
    ConfigureActivityRewards: jest.fn(),
  }),
);

jest.mock(
  '../../../components/SelectStakingPage/components/SelectActivityRewardsConfiguration',
  () => ({
    SelectActivityRewardsConfiguration: jest.fn(),
  }),
);

jest.mock('../../../components/ui/BackButton', () => ({
  BackButton: jest.fn(),
}));

jest.mock('../../../components/ui', () => ({
  Alert: jest.fn(),
}));

jest.mock('../../../hooks', () => ({
  usePageState: jest.fn(),
  useServices: jest.fn(),
  useStakingContracts: jest.fn(),
  useStakingProgram: jest.fn(),
}));

const mockUsePageState = usePageState as jest.MockedFunction<
  typeof usePageState
>;
const mockUseServices = useServices as jest.MockedFunction<typeof useServices>;
const mockUseStakingContracts = useStakingContracts as jest.MockedFunction<
  typeof useStakingContracts
>;
const mockUseStakingProgram = useStakingProgram as jest.MockedFunction<
  typeof useStakingProgram
>;

const MockBackButton = BackButton as jest.MockedFunction<typeof BackButton>;
const MockConfigureActivityRewards =
  ConfigureActivityRewards as jest.MockedFunction<
    typeof ConfigureActivityRewards
  >;
const MockSelectActivityRewardsConfiguration =
  SelectActivityRewardsConfiguration as jest.MockedFunction<
    typeof SelectActivityRewardsConfiguration
  >;

const mockGotoPage = jest.fn();

type SetupOptions = {
  isLoading?: boolean;
  hasService?: boolean;
  defaultStakingProgramId?: string | null;
  selectedStakingProgramId?: string | null;
};

const setupMocks = ({
  isLoading = false,
  hasService = false,
  defaultStakingProgramId = DEFAULT_STAKING_PROGRAM_ID,
  selectedStakingProgramId = DEFAULT_STAKING_PROGRAM_ID,
}: SetupOptions = {}) => {
  mockUsePageState.mockReturnValue({
    goto: mockGotoPage,
  } as unknown as ReturnType<typeof usePageState>);
  mockUseServices.mockReturnValue({
    isLoading,
    selectedService: hasService ? makeService() : undefined,
    selectedAgentConfig: { defaultStakingProgramId },
  } as unknown as ReturnType<typeof useServices>);
  mockUseStakingContracts.mockReturnValue({
    currentStakingProgramId: selectedStakingProgramId,
  } as ReturnType<typeof useStakingContracts>);
  mockUseStakingProgram.mockReturnValue({
    selectedStakingProgramId,
  } as ReturnType<typeof useStakingProgram>);
};

describe('SelectStakingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    MockBackButton.mockImplementation(({ onPrev }) => (
      <button data-testid="back-button" onClick={onPrev}>
        Back
      </button>
    ));

    MockConfigureActivityRewards.mockImplementation(
      ({ backButton, onChangeConfiguration }) => (
        <div data-testid="configure-view">
          {backButton}
          <button
            data-testid="change-configuration"
            onClick={onChangeConfiguration}
          >
            Change Configuration
          </button>
        </div>
      ),
    );

    MockSelectActivityRewardsConfiguration.mockImplementation(
      ({ backButton, onSelectStart, onSelectEnd }) => (
        <div data-testid="list-view">
          {backButton}
          <button data-testid="select-start" onClick={onSelectStart}>
            Select
          </button>
          <button data-testid="select-end" onClick={onSelectEnd}>
            Select End
          </button>
        </div>
      ),
    );
  });

  // ─── View state: initial rendering ───────────────────────────────────────────

  describe('initial view state', () => {
    it('shows loading spinner while isLoading is true', () => {
      setupMocks({ isLoading: true });
      render(<SelectStakingPage mode="onboard" />);
      // Neither content view is shown while loading
      expect(screen.queryByTestId('configure-view')).not.toBeInTheDocument();
      expect(screen.queryByTestId('list-view')).not.toBeInTheDocument();
      // Ant Design Spin renders with aria-busy
      expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    });

    it('shows configure view in onboard mode when no service exists', () => {
      setupMocks({ hasService: false });
      render(<SelectStakingPage mode="onboard" />);
      expect(screen.getByTestId('configure-view')).toBeInTheDocument();
    });

    it('shows configure view in onboard mode when service uses default staking program', () => {
      setupMocks({
        hasService: true,
        defaultStakingProgramId: DEFAULT_STAKING_PROGRAM_ID,
        selectedStakingProgramId: DEFAULT_STAKING_PROGRAM_ID,
      });
      render(<SelectStakingPage mode="onboard" />);
      expect(screen.getByTestId('configure-view')).toBeInTheDocument();
    });

    it('shows list view in onboard mode when service uses non-default staking program', () => {
      setupMocks({
        hasService: true,
        defaultStakingProgramId: DEFAULT_STAKING_PROGRAM_ID,
        selectedStakingProgramId: SECOND_STAKING_PROGRAM_ID,
      });
      render(<SelectStakingPage mode="onboard" />);
      expect(screen.getByTestId('list-view')).toBeInTheDocument();
    });

    it('shows list view in migrate mode regardless of service or staking selection', () => {
      setupMocks({ hasService: false });
      render(<SelectStakingPage mode="migrate" />);
      expect(screen.getByTestId('list-view')).toBeInTheDocument();
    });
  });

  // ─── Back button visibility ───────────────────────────────────────────────────

  describe('back button visibility', () => {
    describe('onboard mode — configure view', () => {
      it('hides back button when no service exists (new user on configure)', () => {
        setupMocks({ hasService: false });
        render(<SelectStakingPage mode="onboard" />);
        expect(screen.getByTestId('configure-view')).toBeInTheDocument();
        expect(screen.queryByTestId('back-button')).not.toBeInTheDocument();
      });

      it('shows back button when service exists on configure view', () => {
        setupMocks({
          hasService: true,
          defaultStakingProgramId: DEFAULT_STAKING_PROGRAM_ID,
          selectedStakingProgramId: DEFAULT_STAKING_PROGRAM_ID,
        });
        render(<SelectStakingPage mode="onboard" />);
        expect(screen.getByTestId('configure-view')).toBeInTheDocument();
        expect(screen.getByTestId('back-button')).toBeInTheDocument();
      });
    });

    describe('onboard mode — list view', () => {
      it('shows back button in LIST_AUTO even when service exists', () => {
        setupMocks({
          hasService: true,
          defaultStakingProgramId: DEFAULT_STAKING_PROGRAM_ID,
          selectedStakingProgramId: SECOND_STAKING_PROGRAM_ID,
        });
        render(<SelectStakingPage mode="onboard" />);
        expect(screen.getByTestId('list-view')).toBeInTheDocument();
        expect(screen.getByTestId('back-button')).toBeInTheDocument();
      });

      it('shows back button in LIST_MANUAL even when no service exists', () => {
        // New user (no service) → CONFIGURE → clicks "Change Configuration" → LIST_MANUAL
        // Back button must be visible so the user can return to configure.
        setupMocks({ hasService: false });
        render(<SelectStakingPage mode="onboard" />);

        // Start on configure, navigate to LIST_MANUAL
        expect(screen.getByTestId('configure-view')).toBeInTheDocument();
        expect(screen.queryByTestId('back-button')).not.toBeInTheDocument();

        fireEvent.click(screen.getByTestId('change-configuration'));

        expect(screen.getByTestId('list-view')).toBeInTheDocument();
        expect(screen.getByTestId('back-button')).toBeInTheDocument();
      });

      it('shows back button in SWITCHING state', () => {
        setupMocks({
          hasService: true,
          defaultStakingProgramId: DEFAULT_STAKING_PROGRAM_ID,
          selectedStakingProgramId: SECOND_STAKING_PROGRAM_ID,
        });
        render(<SelectStakingPage mode="onboard" />);
        expect(screen.getByTestId('list-view')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('select-start'));

        // Still showing list-view (SWITCHING keeps list stable)
        expect(screen.getByTestId('list-view')).toBeInTheDocument();
        expect(screen.getByTestId('back-button')).toBeInTheDocument();
      });
    });

    describe('migrate mode', () => {
      it('shows back button when service exists', () => {
        setupMocks({ hasService: true });
        render(<SelectStakingPage mode="migrate" />);
        expect(screen.getByTestId('back-button')).toBeInTheDocument();
      });

      it('hides back button when no service exists in migrate mode', () => {
        setupMocks({ hasService: false });
        render(<SelectStakingPage mode="migrate" />);
        expect(screen.queryByTestId('back-button')).not.toBeInTheDocument();
      });
    });
  });

  // ─── handleBack navigation ────────────────────────────────────────────────────

  describe('handleBack navigation', () => {
    describe('onboard mode — list views navigate to configure', () => {
      it('LIST_AUTO → back → shows configure view', () => {
        setupMocks({
          hasService: true,
          defaultStakingProgramId: DEFAULT_STAKING_PROGRAM_ID,
          selectedStakingProgramId: SECOND_STAKING_PROGRAM_ID,
        });
        render(<SelectStakingPage mode="onboard" />);
        expect(screen.getByTestId('list-view')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('back-button'));

        expect(screen.getByTestId('configure-view')).toBeInTheDocument();
        expect(mockGotoPage).not.toHaveBeenCalled();
      });

      it('LIST_MANUAL → back → shows configure view', () => {
        setupMocks({ hasService: false });
        render(<SelectStakingPage mode="onboard" />);

        fireEvent.click(screen.getByTestId('change-configuration'));
        expect(screen.getByTestId('list-view')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('back-button'));

        expect(screen.getByTestId('configure-view')).toBeInTheDocument();
        expect(mockGotoPage).not.toHaveBeenCalled();
      });

      it('SWITCHING → back → navigates to Main', () => {
        // A selection is already committed and in-flight in SWITCHING state.
        // Clicking back at that point exits to Main rather than looping back to configure.
        setupMocks({
          hasService: true,
          defaultStakingProgramId: DEFAULT_STAKING_PROGRAM_ID,
          selectedStakingProgramId: SECOND_STAKING_PROGRAM_ID,
        });
        render(<SelectStakingPage mode="onboard" />);

        fireEvent.click(screen.getByTestId('select-start')); // → SWITCHING
        expect(screen.getByTestId('list-view')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('back-button'));

        expect(mockGotoPage).toHaveBeenCalledWith(PAGES.Main);
        expect(mockGotoPage).toHaveBeenCalledTimes(1);
      });
    });

    describe('onboard mode — configure view navigates to Main', () => {
      it('CONFIGURE (with service) → back → gotoPage(Main)', () => {
        setupMocks({
          hasService: true,
          defaultStakingProgramId: DEFAULT_STAKING_PROGRAM_ID,
          selectedStakingProgramId: DEFAULT_STAKING_PROGRAM_ID,
        });
        render(<SelectStakingPage mode="onboard" />);
        expect(screen.getByTestId('configure-view')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('back-button'));

        expect(mockGotoPage).toHaveBeenCalledWith(PAGES.Main);
        expect(mockGotoPage).toHaveBeenCalledTimes(1);
      });

      it('CONFIGURE_MANUAL (backed from list, with service) → back → gotoPage(Main)', () => {
        setupMocks({
          hasService: true,
          defaultStakingProgramId: DEFAULT_STAKING_PROGRAM_ID,
          selectedStakingProgramId: SECOND_STAKING_PROGRAM_ID,
        });
        render(<SelectStakingPage mode="onboard" />);

        // Back from list → CONFIGURE_MANUAL
        fireEvent.click(screen.getByTestId('back-button'));
        expect(screen.getByTestId('configure-view')).toBeInTheDocument();

        // Back from CONFIGURE_MANUAL → Main
        fireEvent.click(screen.getByTestId('back-button'));

        expect(mockGotoPage).toHaveBeenCalledWith(PAGES.Main);
        expect(mockGotoPage).toHaveBeenCalledTimes(1);
      });
    });

    describe('migrate mode — back always navigates to Main', () => {
      it('LIST_AUTO → back → gotoPage(Main)', () => {
        setupMocks({ hasService: true });
        render(<SelectStakingPage mode="migrate" />);
        expect(screen.getByTestId('list-view')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('back-button'));

        expect(mockGotoPage).toHaveBeenCalledWith(PAGES.Main);
        expect(mockGotoPage).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ─── SWITCHING state transitions ─────────────────────────────────────────────

  describe('SWITCHING state', () => {
    it('onSelectStart → SWITCHING keeps list view stable', () => {
      setupMocks({
        hasService: true,
        defaultStakingProgramId: DEFAULT_STAKING_PROGRAM_ID,
        selectedStakingProgramId: SECOND_STAKING_PROGRAM_ID,
      });
      render(<SelectStakingPage mode="onboard" />);
      expect(screen.getByTestId('list-view')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('select-start'));

      expect(screen.getByTestId('list-view')).toBeInTheDocument();
    });

    it('onSelectEnd after SWITCHING returns to list view', () => {
      setupMocks({
        hasService: true,
        defaultStakingProgramId: DEFAULT_STAKING_PROGRAM_ID,
        selectedStakingProgramId: SECOND_STAKING_PROGRAM_ID,
      });
      render(<SelectStakingPage mode="onboard" />);

      fireEvent.click(screen.getByTestId('select-start'));
      fireEvent.click(screen.getByTestId('select-end'));

      expect(screen.getByTestId('list-view')).toBeInTheDocument();
    });
  });

  // ─── "Change Configuration" navigation ───────────────────────────────────────

  describe('"Change Configuration" navigation', () => {
    it('configure view → Change Configuration → list view', () => {
      setupMocks({ hasService: false });
      render(<SelectStakingPage mode="onboard" />);
      expect(screen.getByTestId('configure-view')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('change-configuration'));

      expect(screen.getByTestId('list-view')).toBeInTheDocument();
    });
  });
});
