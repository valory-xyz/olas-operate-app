import { fireEvent, render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { AgentSetupCompleteModal } from '../../../components/ui/AgentSetupCompleteModal';
import { PAGES } from '../../../constants/pages';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
const mockGoto = jest.fn();
const mockSetIsInitiallyFunded = jest.fn();

jest.mock('../../../hooks', () => ({
  usePageState: () => ({ goto: mockGoto }),
  useIsInitiallyFunded: () => ({
    setIsInitiallyFunded: mockSetIsInitiallyFunded,
  }),
}));

jest.mock('../../../components/custom-icons', () => ({
  SuccessOutlined: () => <span data-testid="success-icon">success</span>,
}));

jest.mock('../../../components/ui/Modal', () => ({
  Modal: ({
    header,
    title,
    description,
    action,
    closable,
    onCancel,
  }: {
    header: React.ReactNode;
    title: string;
    description: string;
    action: React.ReactNode;
    closable?: boolean;
    onCancel?: () => void;
  }) => (
    <div data-testid="modal" data-closable={closable ? 'true' : 'false'}>
      <div data-testid="modal-header">{header}</div>
      <div data-testid="modal-title">{title}</div>
      <div data-testid="modal-description">{description}</div>
      <div data-testid="modal-action">{action}</div>
      {closable && (
        <button data-testid="modal-cancel" onClick={onCancel}>
          close
        </button>
      )}
    </div>
  ),
}));

describe('AgentSetupCompleteModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal with correct title and description', () => {
    render(<AgentSetupCompleteModal />);
    expect(screen.getByTestId('modal-title')).toHaveTextContent(
      'Setup Complete',
    );
    expect(screen.getByTestId('modal-description')).toHaveTextContent(
      'Your autonomous AI agent is ready to work for you.',
    );
  });

  it('renders the SuccessOutlined icon as header', () => {
    render(<AgentSetupCompleteModal />);
    expect(screen.getByTestId('success-icon')).toBeInTheDocument();
  });

  it('calls setIsInitiallyFunded on mount', () => {
    render(<AgentSetupCompleteModal />);
    expect(mockSetIsInitiallyFunded).toHaveBeenCalledTimes(1);
  });

  it('navigates to Main when View Agent is clicked', () => {
    render(<AgentSetupCompleteModal />);
    fireEvent.click(screen.getByRole('button', { name: 'View Agent' }));
    expect(mockGoto).toHaveBeenCalledWith(PAGES.Main);
  });

  it('also calls onDismiss when View Agent is clicked, if provided', () => {
    const mockOnDismiss = jest.fn();
    render(<AgentSetupCompleteModal onDismiss={mockOnDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: 'View Agent' }));
    expect(mockGoto).toHaveBeenCalledWith(PAGES.Main);
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('is not closable by default', () => {
    render(<AgentSetupCompleteModal />);
    expect(screen.getByTestId('modal')).toHaveAttribute(
      'data-closable',
      'false',
    );
  });

  it('is closable when onDismiss is provided, and the close action fires onDismiss', () => {
    const mockOnDismiss = jest.fn();
    render(<AgentSetupCompleteModal onDismiss={mockOnDismiss} />);
    expect(screen.getByTestId('modal')).toHaveAttribute(
      'data-closable',
      'true',
    );
    fireEvent.click(screen.getByTestId('modal-cancel'));
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });
});
