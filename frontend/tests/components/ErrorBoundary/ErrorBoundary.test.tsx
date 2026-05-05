import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../constants/providers', () => ({}));
jest.mock('../../../config/providers', () => ({ providers: [] }));

jest.mock('../../../components/SupportModal/SupportModal', () => ({
  SupportModal: ({ open }: { open: boolean }) =>
    open
      ? createElement('div', { 'data-testid': 'support-modal' }, 'SupportModal')
      : null,
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ErrorBoundaryModule =
  require('../../../components/ErrorBoundary/index') as typeof import('../../../components/ErrorBoundary/index');
/* eslint-enable @typescript-eslint/no-var-requires */

const ErrorBoundary = ErrorBoundaryModule.default;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A component that throws on render to trigger the error boundary. */
const ThrowingChild = ({ message }: { message: string }) => {
  throw new Error(message);
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ErrorBoundary', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error from React error boundary logging
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Safe child content</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Safe child content')).toBeInTheDocument();
  });

  it('shows MainPageFallback when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild message="test error" />
      </ErrorBoundary>,
    );
    expect(
      screen.getByText('An unexpected error occurred'),
    ).toBeInTheDocument();
  });

  it('calls logger prop with error and errorInfo on catch', () => {
    const logger = jest.fn();
    render(
      <ErrorBoundary logger={logger}>
        <ThrowingChild message="logged error" />
      </ErrorBoundary>,
    );

    expect(logger).toHaveBeenCalledTimes(1);
    const [error, errorInfo] = logger.mock.calls[0];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('logged error');
    expect(errorInfo).toHaveProperty('componentStack');
  });

  it('shows custom fallbackComponent when provided', () => {
    const customFallback = <div>Custom fallback UI</div>;
    render(
      <ErrorBoundary fallbackComponent={customFallback}>
        <ThrowingChild message="fallback error" />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Custom fallback UI')).toBeInTheDocument();
    expect(
      screen.queryByText('An unexpected error occurred'),
    ).not.toBeInTheDocument();
  });

  describe('MainPageFallback', () => {
    it('contains "An unexpected error occurred" text', () => {
      render(
        <ErrorBoundary>
          <ThrowingChild message="trigger fallback" />
        </ErrorBoundary>,
      );
      expect(
        screen.getByText('An unexpected error occurred'),
      ).toBeInTheDocument();
    });

    it('has a "Contact Support" button', () => {
      render(
        <ErrorBoundary>
          <ThrowingChild message="trigger fallback" />
        </ErrorBoundary>,
      );
      const button = screen.getByRole('button', { name: 'Contact Support' });
      expect(button).toBeInTheDocument();
    });

    it('opens SupportModal when "Contact Support" is clicked', () => {
      render(
        <ErrorBoundary>
          <ThrowingChild message="trigger fallback" />
        </ErrorBoundary>,
      );

      // Modal should not be visible initially
      expect(screen.queryByTestId('support-modal')).not.toBeInTheDocument();

      const button = screen.getByRole('button', { name: 'Contact Support' });
      fireEvent.click(button);

      expect(screen.getByTestId('support-modal')).toBeInTheDocument();
    });
  });
});
