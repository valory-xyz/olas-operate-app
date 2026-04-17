import { render, screen } from '@testing-library/react';
import React from 'react';

import { FinishingSetupModal } from '../../../components/ui/FinishingSetupModal';

jest.mock('../../../components/ui/Modal', () => ({
  Modal: ({
    header,
    title,
    description,
  }: {
    header: React.ReactNode;
    title: string;
    description: string;
  }) => (
    <div data-testid="modal">
      <div data-testid="modal-header">{header}</div>
      <div data-testid="modal-title">{title}</div>
      <div data-testid="modal-description">{description}</div>
    </div>
  ),
}));

jest.mock('../../../components/custom-icons', () => ({
  LoadingOutlined: () => <span data-testid="loading-icon">loading</span>,
}));

describe('FinishingSetupModal', () => {
  it('renders with correct title', () => {
    render(<FinishingSetupModal />);
    expect(screen.getByTestId('modal-title')).toHaveTextContent(
      'Finishing Setup',
    );
  });

  it('renders with correct description', () => {
    render(<FinishingSetupModal />);
    expect(screen.getByTestId('modal-description')).toHaveTextContent(
      'It usually takes a few minutes. Please keep the app open until the process is complete.',
    );
  });

  it('renders loading spinner in header', () => {
    render(<FinishingSetupModal />);
    expect(screen.getByTestId('loading-icon')).toBeInTheDocument();
  });
});
