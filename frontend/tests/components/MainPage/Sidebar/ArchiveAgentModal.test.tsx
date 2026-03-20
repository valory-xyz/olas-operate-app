import { fireEvent, render, screen } from '@testing-library/react';

import { ArchiveAgentModal } from '../../../../components/MainPage/Sidebar/ArchiveAgentModal';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../../mocks/styledComponents').styledComponentsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

describe('ArchiveAgentModal', () => {
  const defaultProps = {
    agentName: 'Agents.fun',
    open: true,
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when open=false', () => {
    const { container } = render(
      <ArchiveAgentModal {...defaultProps} open={false} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the modal title when open=true', () => {
    render(<ArchiveAgentModal {...defaultProps} />);
    expect(screen.getByText('Archive agent')).toBeInTheDocument();
  });

  it('renders the agent name in the description', () => {
    render(<ArchiveAgentModal {...defaultProps} />);
    expect(screen.getByText(/Agents\.fun will be removed/)).toBeInTheDocument();
  });

  it('mentions restorability in the description', () => {
    render(<ArchiveAgentModal {...defaultProps} />);
    expect(screen.getByText(/You can restore it anytime/)).toBeInTheDocument();
  });

  it('renders Cancel and Archive Agent buttons', () => {
    render(<ArchiveAgentModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Archive Agent/i }),
    ).toBeInTheDocument();
  });

  it('calls onCancel when Cancel button is clicked', () => {
    const onCancel = jest.fn();
    render(<ArchiveAgentModal {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when Archive Agent button is clicked', () => {
    const onConfirm = jest.fn();
    render(<ArchiveAgentModal {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: /Archive Agent/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('uses the provided agentName in the description', () => {
    render(<ArchiveAgentModal {...defaultProps} agentName="Omenstrat" />);
    expect(screen.getByText(/Omenstrat will be removed/)).toBeInTheDocument();
  });
});
