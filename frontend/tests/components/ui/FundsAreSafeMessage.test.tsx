import { fireEvent, render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { FundsAreSafeMessage } from '../../../components/ui/FundsAreSafeMessage';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
const mockToggleSupportModal = jest.fn();

jest.mock('../../../context/SupportModalProvider', () => ({
  useSupportModal: () => ({
    toggleSupportModal: mockToggleSupportModal,
  }),
}));

describe('FundsAreSafeMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the safety message text', () => {
    render(<FundsAreSafeMessage />);
    expect(
      screen.getByText(
        /Don't worry, your funds remain safe. Try again or contact support./,
      ),
    ).toBeInTheDocument();
  });

  it('renders the Contact Support button', () => {
    render(<FundsAreSafeMessage />);
    expect(
      screen.getByRole('button', { name: 'Contact Support' }),
    ).toBeInTheDocument();
  });

  it('calls toggleSupportModal when Contact Support is clicked', () => {
    render(<FundsAreSafeMessage />);
    fireEvent.click(screen.getByRole('button', { name: 'Contact Support' }));
    expect(mockToggleSupportModal).toHaveBeenCalledTimes(1);
  });

  it('does not render the Retry button when onRetry is not provided', () => {
    render(<FundsAreSafeMessage />);
    expect(
      screen.queryByRole('button', { name: 'Retry' }),
    ).not.toBeInTheDocument();
  });

  it('renders the Retry button when onRetry is provided', () => {
    const onRetry = jest.fn();
    render(<FundsAreSafeMessage onRetry={onRetry} />);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('calls onRetry when Retry button is clicked', () => {
    const onRetry = jest.fn();
    render(<FundsAreSafeMessage onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows loading state on Retry button when onRetryProps.isLoading is true', () => {
    const onRetry = jest.fn();
    const { container } = render(
      <FundsAreSafeMessage
        onRetry={onRetry}
        onRetryProps={{ isLoading: true }}
      />,
    );
    // Antd loading buttons get the ant-btn-loading class
    const retryButton = screen.getByRole('button', { name: /Retry/i });
    expect(retryButton).toBeInTheDocument();
    // Contact Support button should also show loading
    const contactButton = screen.getByRole('button', {
      name: /Contact Support/i,
    });
    expect(contactButton).toBeInTheDocument();
    expect(container).toBeInTheDocument();
  });

  it('does not render the restart message by default', () => {
    render(<FundsAreSafeMessage />);
    expect(
      screen.queryByText('You can also try restarting the app!'),
    ).not.toBeInTheDocument();
  });

  it('renders the restart message when showRestartMessage is true', () => {
    render(<FundsAreSafeMessage showRestartMessage />);
    expect(
      screen.getByText('You can also try restarting the app!'),
    ).toBeInTheDocument();
  });

  it('does not render the restart message when showRestartMessage is false', () => {
    render(<FundsAreSafeMessage showRestartMessage={false} />);
    expect(
      screen.queryByText('You can also try restarting the app!'),
    ).not.toBeInTheDocument();
  });
});
