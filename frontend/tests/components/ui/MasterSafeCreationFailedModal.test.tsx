import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { MasterSafeCreationFailedModal } from '../../../components/ui/MasterSafeCreationFailedModal';

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

jest.mock('../../../components/custom-icons', () => ({
  WarningOutlined: () => <span data-testid="warning-icon">warning</span>,
}));

describe('MasterSafeCreationFailedModal', () => {
  const mockOnTryAgain = jest.fn();
  const mockOnContactSupport = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with correct title', () => {
    render(
      <MasterSafeCreationFailedModal
        onTryAgain={mockOnTryAgain}
        onContactSupport={mockOnContactSupport}
      />,
    );
    expect(screen.getByTestId('modal-title')).toHaveTextContent(
      'Master Safe Creation Failed',
    );
  });

  it('renders with correct description', () => {
    render(
      <MasterSafeCreationFailedModal
        onTryAgain={mockOnTryAgain}
        onContactSupport={mockOnContactSupport}
      />,
    );
    expect(screen.getByTestId('modal-description')).toHaveTextContent(
      'Please try again in a few minutes.',
    );
  });

  it('renders warning icon in header', () => {
    render(
      <MasterSafeCreationFailedModal
        onTryAgain={mockOnTryAgain}
        onContactSupport={mockOnContactSupport}
      />,
    );
    expect(screen.getByTestId('warning-icon')).toBeInTheDocument();
  });

  it('calls onTryAgain when Try Again button is clicked', () => {
    render(
      <MasterSafeCreationFailedModal
        onTryAgain={mockOnTryAgain}
        onContactSupport={mockOnContactSupport}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(mockOnTryAgain).toHaveBeenCalledTimes(1);
  });

  it('calls onContactSupport when Contact Support button is clicked', () => {
    render(
      <MasterSafeCreationFailedModal
        onTryAgain={mockOnTryAgain}
        onContactSupport={mockOnContactSupport}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Contact Support' }));
    expect(mockOnContactSupport).toHaveBeenCalledTimes(1);
  });
});
