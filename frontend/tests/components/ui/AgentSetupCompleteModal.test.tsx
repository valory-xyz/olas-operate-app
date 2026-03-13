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
  }: {
    header: React.ReactNode;
    title: string;
    description: string;
    action: React.ReactNode;
  }) => (
    <div data-testid="modal">
      <div data-testid="modal-header">{header}</div>
      <div data-testid="modal-title">{title}</div>
      <div data-testid="modal-description">{description}</div>
      <div data-testid="modal-action">{action}</div>
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

  it('navigates to Main page when View Agent button is clicked', () => {
    render(<AgentSetupCompleteModal />);
    const button = screen.getByRole('button', { name: 'View Agent' });
    fireEvent.click(button);
    expect(mockGoto).toHaveBeenCalledWith(PAGES.Main);
  });
});
