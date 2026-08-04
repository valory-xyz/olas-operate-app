import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ConnectFirstRunModal } from '../../../../../components/MainPage/Home/ConnectFirstRunModal';

jest.mock('../../../../../components/ui', () => {
  const { createElement, type ReactNode } = jest.requireActual('react');
  return {
    Modal: ({
      open,
      title,
      description,
      action,
      closable,
    }: {
      open: boolean;
      title?: string;
      description?: ReactNode;
      action?: ReactNode;
      closable?: boolean;
    }) =>
      open
        ? createElement(
            'div',
            { 'data-testid': 'modal', 'data-closable': closable },
            title && createElement('h5', null, title),
            description &&
              createElement('span', { 'data-testid': 'description' }, description),
            action,
          )
        : null,
  };
});

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

  it('has no close button (closable is false)', () => {
    render(
      <ConnectFirstRunModal open={true} onOpenProfile={mockOnOpenProfile} />,
    );
    const modal = screen.getByTestId('modal');
    expect(modal).toHaveAttribute('data-closable', 'false');
  });

  it('calls onOpenProfile when the CTA button is clicked', async () => {
    render(
      <ConnectFirstRunModal open={true} onOpenProfile={mockOnOpenProfile} />,
    );
    await userEvent.click(
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
