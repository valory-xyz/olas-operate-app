import { fireEvent, render, screen } from '@testing-library/react';

import { DecommissioningUnavailableModal } from '../../../../components/AgentWallet/Decommission/DecommissioningUnavailableModal';

// The custom Modal sets `closable`, so antd renders its own X close button
// with aria-label="Close" — same accessible name as our action button.
// Resolve by selecting the action button via its visible text content (the
// X button has no visible "Close" text, only the icon + aria-label).
const getActionCloseButton = () =>
  screen.getByText('Close').closest('button') as HTMLButtonElement;

describe('DecommissioningUnavailableModal', () => {
  it('renders the title, countdown text, and Close button when open', () => {
    render(
      <DecommissioningUnavailableModal
        open
        onClose={jest.fn()}
        countdownDisplay="1 day 17 hours 55 minutes 29 seconds"
      />,
    );

    expect(screen.getByText('Decommissioning Unavailable')).toBeInTheDocument();
    expect(
      screen.getByText(/1 day 17 hours 55 minutes 29 seconds/),
    ).toBeInTheDocument();
    expect(getActionCloseButton()).toBeInTheDocument();
  });

  it('calls onClose when the Close action button is clicked', () => {
    const onClose = jest.fn();
    render(
      <DecommissioningUnavailableModal
        open
        onClose={onClose}
        countdownDisplay="1 day"
      />,
    );

    fireEvent.click(getActionCloseButton());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when open is false', () => {
    render(
      <DecommissioningUnavailableModal
        open={false}
        onClose={jest.fn()}
        countdownDisplay="1 day"
      />,
    );

    expect(
      screen.queryByText('Decommissioning Unavailable'),
    ).not.toBeInTheDocument();
  });
});
