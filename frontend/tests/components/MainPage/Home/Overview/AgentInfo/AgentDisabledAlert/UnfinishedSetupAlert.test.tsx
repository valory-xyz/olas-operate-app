import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { UnfinishedSetupAlert } from '../../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentDisabledAlert/UnfinishedSetupAlert';
import { PAGES, SETUP_SCREEN } from '../../../../../../../constants';
import { useCompleteAgentSetup } from '../../../../../../../hooks';

// ---------------------------------------------------------------------------
// Mock navigation hooks
// ---------------------------------------------------------------------------
const mockGoto = jest.fn();
const mockGotoSetup = jest.fn();

jest.mock('../../../../../../../hooks', () => ({
  usePageState: () => ({ goto: mockGoto }),
  useSetup: () => ({ goto: mockGotoSetup }),
  useCompleteAgentSetup: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Mock UI components
// ---------------------------------------------------------------------------
jest.mock('../../../../../../../components/ui', () => ({
  Alert: ({ message }: { message: React.ReactNode }) => (
    <div data-testid="alert">{message}</div>
  ),
  FinishingSetupModal: () => (
    <div data-testid="finishing-setup-modal">FinishingSetupModal</div>
  ),
  AgentSetupCompleteModal: () => (
    <div data-testid="agent-setup-complete-modal">AgentSetupCompleteModal</div>
  ),
  MasterSafeCreationFailedModal: ({
    onTryAgain,
    onContactSupport,
  }: {
    onTryAgain: () => void;
    onContactSupport: () => void;
  }) => (
    <div data-testid="master-safe-creation-failed-modal">
      <button onClick={onTryAgain}>Try Again</button>
      <button onClick={onContactSupport}>Contact Support</button>
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const mockHandleCompleteSetup = jest.fn();
const mockResetShouldNavigate = jest.fn();
const mockHandleTryAgain = jest.fn();
const mockHandleContactSupport = jest.fn();

const setupHookMock = (
  overrides: Partial<ReturnType<typeof useCompleteAgentSetup>> = {},
) => {
  (useCompleteAgentSetup as jest.Mock).mockReturnValue({
    setupState: 'needsFunding',
    handleCompleteSetup: mockHandleCompleteSetup,
    modalToShow: null,
    shouldNavigateToFundYourAgent: false,
    resetShouldNavigate: mockResetShouldNavigate,
    handleTryAgain: mockHandleTryAgain,
    handleContactSupport: mockHandleContactSupport,
    ...overrides,
  });
};

describe('UnfinishedSetupAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHookMock();
  });

  // -------------------------------------------------------------------------
  // Button disabled state
  // -------------------------------------------------------------------------
  it('disables the Complete Setup button when setupState is detecting', () => {
    setupHookMock({ setupState: 'detecting' });
    render(<UnfinishedSetupAlert />);
    expect(
      screen.getByRole('button', { name: 'Complete Setup' }),
    ).toBeDisabled();
  });

  it('enables the Complete Setup button when setupState is not detecting', () => {
    setupHookMock({ setupState: 'needsFunding' });
    render(<UnfinishedSetupAlert />);
    expect(
      screen.getByRole('button', { name: 'Complete Setup' }),
    ).not.toBeDisabled();
  });

  // -------------------------------------------------------------------------
  // Button click
  // -------------------------------------------------------------------------
  it('calls handleCompleteSetup when Complete Setup button is clicked', () => {
    render(<UnfinishedSetupAlert />);
    fireEvent.click(screen.getByRole('button', { name: 'Complete Setup' }));
    expect(mockHandleCompleteSetup).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Modal rendering
  // -------------------------------------------------------------------------
  it('renders FinishingSetupModal when modalToShow is creatingSafe', () => {
    setupHookMock({ modalToShow: 'creatingSafe' });
    render(<UnfinishedSetupAlert />);
    expect(screen.getByTestId('finishing-setup-modal')).toBeInTheDocument();
    expect(
      screen.queryByTestId('agent-setup-complete-modal'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('master-safe-creation-failed-modal'),
    ).not.toBeInTheDocument();
  });

  it('renders AgentSetupCompleteModal when modalToShow is setupComplete', () => {
    setupHookMock({ modalToShow: 'setupComplete' });
    render(<UnfinishedSetupAlert />);
    expect(
      screen.getByTestId('agent-setup-complete-modal'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('finishing-setup-modal'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('master-safe-creation-failed-modal'),
    ).not.toBeInTheDocument();
  });

  it('renders MasterSafeCreationFailedModal when modalToShow is safeCreationFailed', () => {
    setupHookMock({ modalToShow: 'safeCreationFailed' });
    render(<UnfinishedSetupAlert />);
    expect(
      screen.getByTestId('master-safe-creation-failed-modal'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('finishing-setup-modal'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('agent-setup-complete-modal'),
    ).not.toBeInTheDocument();
  });

  it('passes handleTryAgain to MasterSafeCreationFailedModal', () => {
    setupHookMock({ modalToShow: 'safeCreationFailed' });
    render(<UnfinishedSetupAlert />);
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(mockHandleTryAgain).toHaveBeenCalledTimes(1);
  });

  it('passes handleContactSupport to MasterSafeCreationFailedModal', () => {
    setupHookMock({ modalToShow: 'safeCreationFailed' });
    render(<UnfinishedSetupAlert />);
    fireEvent.click(screen.getByRole('button', { name: 'Contact Support' }));
    expect(mockHandleContactSupport).toHaveBeenCalledTimes(1);
  });

  it('renders no modal when modalToShow is null', () => {
    setupHookMock({ modalToShow: null });
    render(<UnfinishedSetupAlert />);
    expect(
      screen.queryByTestId('finishing-setup-modal'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('agent-setup-complete-modal'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('master-safe-creation-failed-modal'),
    ).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Navigation effect
  // -------------------------------------------------------------------------
  it('navigates to FundYourAgent and calls resetShouldNavigate when shouldNavigateToFundYourAgent is true', () => {
    setupHookMock({ shouldNavigateToFundYourAgent: true });
    render(<UnfinishedSetupAlert />);
    expect(mockGotoSetup).toHaveBeenCalledWith(SETUP_SCREEN.FundYourAgent);
    expect(mockGoto).toHaveBeenCalledWith(PAGES.Setup);
    expect(mockResetShouldNavigate).toHaveBeenCalledTimes(1);
  });

  it('does not navigate when shouldNavigateToFundYourAgent is false', () => {
    setupHookMock({ shouldNavigateToFundYourAgent: false });
    render(<UnfinishedSetupAlert />);
    expect(mockGotoSetup).not.toHaveBeenCalled();
    expect(mockGoto).not.toHaveBeenCalled();
    expect(mockResetShouldNavigate).not.toHaveBeenCalled();
  });
});
