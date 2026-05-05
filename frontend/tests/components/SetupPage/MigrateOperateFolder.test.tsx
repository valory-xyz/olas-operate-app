import { fireEvent, render, screen } from '@testing-library/react';

import { MigrateOperateFolder } from '../../../components/SetupPage/MigrateOperateFolder';
import { SETUP_SCREEN } from '../../../constants';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../mocks/styledComponents').styledComponentsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

const mockGoto = jest.fn();
jest.mock('../../../hooks', () => ({
  useSetup: () => ({ goto: mockGoto }),
}));

jest.mock('../../../components/ui/BackButton', () => ({
  BackButton: ({ onPrev }: { onPrev: () => void }) => (
    <button data-testid="back-btn" onClick={onPrev}>
      Back
    </button>
  ),
}));

describe('MigrateOperateFolder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the main heading', () => {
    render(<MigrateOperateFolder />);
    expect(
      screen.getByText('Recover an Existing Pearl Account'),
    ).toBeInTheDocument();
  });

  it('renders the back button', () => {
    render(<MigrateOperateFolder />);
    expect(screen.getByTestId('back-btn')).toBeInTheDocument();
  });

  it('navigates to AccountRecovery when back is clicked', () => {
    render(<MigrateOperateFolder />);
    fireEvent.click(screen.getByTestId('back-btn'));
    expect(mockGoto).toHaveBeenCalledWith(SETUP_SCREEN.AccountRecovery);
  });

  it('renders the migration step instructions', () => {
    render(<MigrateOperateFolder />);
    // Step 1
    expect(
      screen.getByText('Quit Pearl app on this machine.'),
    ).toBeInTheDocument();
    // Step 4
    expect(
      screen.getByText('Start Pearl and sign in with your original password.'),
    ).toBeInTheDocument();
  });

  it('renders the .operate folder path for MacOS', () => {
    render(<MigrateOperateFolder />);
    expect(
      screen.getByText(/~\/Users\/<username>\/.operate/),
    ).toBeInTheDocument();
  });

  it('renders the "Lost your .operate folder?" section', () => {
    render(<MigrateOperateFolder />);
    expect(screen.getByText('Lost your .operate folder?')).toBeInTheDocument();
  });

  it('renders the Withdraw Funds button', () => {
    render(<MigrateOperateFolder />);
    expect(
      screen.getByRole('button', { name: 'Withdraw Funds' }),
    ).toBeInTheDocument();
  });

  it('navigates to FundRecovery when Withdraw Funds is clicked', () => {
    render(<MigrateOperateFolder />);
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw Funds' }));
    expect(mockGoto).toHaveBeenCalledWith(SETUP_SCREEN.FundRecovery);
  });
});
