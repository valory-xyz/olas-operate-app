import { fireEvent, render, screen } from '@testing-library/react';

import { ConnectFirstRunModal } from '../../../../../components/MainPage/Home/ConnectFirstRunModal';

jest.mock('../../../../../components/ui', () => ({
  Modal: ({
    open,
    title,
    description,
    action,
    closable,
  }: {
    open: boolean;
    title?: string;
    description?: React.ReactNode;
    action?: React.ReactNode;
    closable?: boolean;
  }) =>
    open ? (
      <div data-testid="modal" data-closable={closable}>
        {title && <h5>{title}</h5>}
        {description && <span data-testid="description">{description}</span>}
        {action}
      </div>
    ) : null,
}));

describe('ConnectFirstRunModal', () => {
  const mockOnOpenProfile = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title "Your agent is ready"', () => {
    render(
      <ConnectFirstRunModal open={true} onOpenProfile={mockOnOpenProfile} />,
    );
    expect(screen.getByText('Your agent is ready')).toBeInTheDocument();
  });

  it('renders the correct description copy', () => {
    render(
      <ConnectFirstRunModal open={true} onOpenProfile={mockOnOpenProfile} />,
    );
    expect(
      screen.getByText(
        'Open the Agent Profile to configure and start your first session in Claude Code.',
      ),
    ).toBeInTheDocument();
  });

  it('renders the "Open Agent Profile" button', () => {
    render(
      <ConnectFirstRunModal open={true} onOpenProfile={mockOnOpenProfile} />,
    );
    expect(
      screen.getByRole('button', { name: /open agent profile/i }),
    ).toBeInTheDocument();
  });

  it('has no close button (closable is not set, defaulting to false)', () => {
    render(
      <ConnectFirstRunModal open={true} onOpenProfile={mockOnOpenProfile} />,
    );
    const modal = screen.getByTestId('modal');
    // ConnectFirstRunModal does not pass closable — Modal defaults to false.
    expect(modal).not.toHaveAttribute('data-closable', 'true');
  });

  it('calls onOpenProfile when the CTA button is clicked', () => {
    render(
      <ConnectFirstRunModal open={true} onOpenProfile={mockOnOpenProfile} />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: /open agent profile/i }),
    );
    expect(mockOnOpenProfile).toHaveBeenCalledTimes(1);
  });

  it('does not render when open is false', () => {
    render(
      <ConnectFirstRunModal open={false} onOpenProfile={mockOnOpenProfile} />,
    );
    expect(screen.queryByText('Your agent is ready')).not.toBeInTheDocument();
  });
});
