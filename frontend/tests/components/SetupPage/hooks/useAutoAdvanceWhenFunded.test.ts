import { renderHook } from '@testing-library/react';

import { useAutoAdvanceWhenFunded } from '../../../../components/SetupPage/hooks/useAutoAdvanceWhenFunded';
import { SETUP_SCREEN } from '../../../../constants/setupScreen';
import { useBalanceAndRefillRequirementsContext } from '../../../../hooks/useBalanceAndRefillRequirementsContext';
import { useSetup } from '../../../../hooks/useSetup';

jest.mock('../../../../hooks/useBalanceAndRefillRequirementsContext', () => ({
  useBalanceAndRefillRequirementsContext: jest.fn(),
}));

jest.mock('../../../../hooks/useSetup', () => ({
  useSetup: jest.fn(),
}));

const mockUseBalanceAndRefillRequirementsContext =
  useBalanceAndRefillRequirementsContext as jest.MockedFunction<
    typeof useBalanceAndRefillRequirementsContext
  >;

const mockUseSetup = useSetup as jest.MockedFunction<typeof useSetup>;

const mockGoto = jest.fn();

const makeFundingContext = (
  overrides: Partial<{
    isBalancesAndFundingRequirementsLoading: boolean;
    isRefillRequired: boolean;
    canStartAgent: boolean;
  }> = {},
) => ({
  isBalancesAndFundingRequirementsLoading: false,
  isRefillRequired: false,
  canStartAgent: true,
  ...overrides,
});

describe('useAutoAdvanceWhenFunded', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSetup.mockReturnValue({
      goto: mockGoto,
    } as unknown as ReturnType<typeof useSetup>);
  });

  // -------------------------------------------------------------------------
  // Eligible screens — should advance when funded
  // -------------------------------------------------------------------------

  it('advances to ConfirmFunding from BalanceCheck when funded', () => {
    mockUseBalanceAndRefillRequirementsContext.mockReturnValue(
      makeFundingContext() as ReturnType<
        typeof useBalanceAndRefillRequirementsContext
      >,
    );

    renderHook(() => useAutoAdvanceWhenFunded(SETUP_SCREEN.BalanceCheck));

    expect(mockGoto).toHaveBeenCalledWith(SETUP_SCREEN.ConfirmFunding);
  });

  it('advances to ConfirmFunding from FundYourAgent when funded', () => {
    mockUseBalanceAndRefillRequirementsContext.mockReturnValue(
      makeFundingContext() as ReturnType<
        typeof useBalanceAndRefillRequirementsContext
      >,
    );

    renderHook(() => useAutoAdvanceWhenFunded(SETUP_SCREEN.FundYourAgent));

    expect(mockGoto).toHaveBeenCalledWith(SETUP_SCREEN.ConfirmFunding);
  });

  // -------------------------------------------------------------------------
  // Loading guard — must not advance while query is in-flight
  // -------------------------------------------------------------------------

  it('does not advance when isBalancesAndFundingRequirementsLoading is true', () => {
    mockUseBalanceAndRefillRequirementsContext.mockReturnValue(
      makeFundingContext({
        isBalancesAndFundingRequirementsLoading: true,
      }) as ReturnType<typeof useBalanceAndRefillRequirementsContext>,
    );

    renderHook(() => useAutoAdvanceWhenFunded(SETUP_SCREEN.FundYourAgent));

    expect(mockGoto).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Refill required guard — must not advance when shortfall remains
  // -------------------------------------------------------------------------

  it('does not advance when isRefillRequired is true', () => {
    mockUseBalanceAndRefillRequirementsContext.mockReturnValue(
      makeFundingContext({ isRefillRequired: true }) as ReturnType<
        typeof useBalanceAndRefillRequirementsContext
      >,
    );

    renderHook(() => useAutoAdvanceWhenFunded(SETUP_SCREEN.FundYourAgent));

    expect(mockGoto).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // canStartAgent guard — must not advance when staking not yet finalized
  // -------------------------------------------------------------------------

  it('does not advance when canStartAgent is false', () => {
    mockUseBalanceAndRefillRequirementsContext.mockReturnValue(
      makeFundingContext({ canStartAgent: false }) as ReturnType<
        typeof useBalanceAndRefillRequirementsContext
      >,
    );

    renderHook(() => useAutoAdvanceWhenFunded(SETUP_SCREEN.FundYourAgent));

    expect(mockGoto).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Ineligible screens — must not interfere with mid-flow screens
  // -------------------------------------------------------------------------

  it.each([
    SETUP_SCREEN.TransferFunds,
    SETUP_SCREEN.SetupOnRamp,
    SETUP_SCREEN.SetupBridgeOnboardingScreen,
    SETUP_SCREEN.ConfirmFunding,
    SETUP_SCREEN.SelectStaking,
    SETUP_SCREEN.Welcome,
  ])('does not advance from ineligible screen "%s"', (screen) => {
    mockUseBalanceAndRefillRequirementsContext.mockReturnValue(
      makeFundingContext() as ReturnType<
        typeof useBalanceAndRefillRequirementsContext
      >,
    );

    renderHook(() => useAutoAdvanceWhenFunded(screen));

    expect(mockGoto).not.toHaveBeenCalled();
  });
});
