import { fireEvent, render, screen } from '@testing-library/react';
import { ethers } from 'ethers';

import { EnterSecretRecoveryPhrase } from '../../../components/AccountRecovery/components/EnterSecretRecoveryPhrase';

const mockOnNext = jest.fn();
const mockOnPrev = jest.fn();
const mockSetSrpError = jest.fn();
const mockSetSrpMnemonic = jest.fn();

let mockContextValue: {
  srpError?: string;
  setSrpError: jest.Mock;
  setSrpMnemonic: jest.Mock;
  onNext: jest.Mock;
  onPrev: jest.Mock;
};

jest.mock(
  '../../../components/AccountRecovery/AccountRecoveryProvider',
  () => ({
    useAccountRecoveryContext: () => mockContextValue,
  }),
);

jest.mock('../../../components/ui', () => ({
  Alert: ({
    message,
    type,
  }: {
    message: React.ReactNode;
    type: string;
    showIcon?: boolean;
  }) => (
    <div data-testid={`alert-${type}`} role="alert">
      {message}
    </div>
  ),
  BackButton: ({ onPrev }: { onPrev: () => void }) => (
    <button data-testid="back-btn" onClick={onPrev}>
      Back
    </button>
  ),
  CardFlex: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <div {...props}>{children}</div>,
}));

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../mocks/styledComponents').styledComponentsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

// Valid 12-word BIP-39 mnemonic for tests
const VALID_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const VALID_WORDS = VALID_MNEMONIC.split(' ');

describe('EnterSecretRecoveryPhrase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContextValue = {
      srpError: undefined,
      setSrpError: mockSetSrpError,
      setSrpMnemonic: mockSetSrpMnemonic,
      onNext: mockOnNext,
      onPrev: mockOnPrev,
    };
  });

  it('renders the title and description', () => {
    render(<EnterSecretRecoveryPhrase />);
    expect(
      screen.getByText('Enter Secret Recovery Phrase'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Enter the 12-word recovery phrase of your Pearl account to reset password/,
      ),
    ).toBeInTheDocument();
  });

  it('renders 12 word inputs', () => {
    render(<EnterSecretRecoveryPhrase />);
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(12);
  });

  it('disables Continue button when words are empty', () => {
    render(<EnterSecretRecoveryPhrase />);
    const button = screen.getByRole('button', { name: 'Continue' });
    expect(button).toBeDisabled();
  });

  it('enables Continue button when a valid mnemonic is entered', () => {
    render(<EnterSecretRecoveryPhrase />);
    const inputs = screen.getAllByRole('textbox');

    VALID_WORDS.forEach((word, i) => {
      fireEvent.change(inputs[i], { target: { value: word } });
    });

    const button = screen.getByRole('button', { name: 'Continue' });
    expect(button).not.toBeDisabled();
  });

  it('calls setSrpMnemonic and onNext when Continue is clicked with valid mnemonic', () => {
    render(<EnterSecretRecoveryPhrase />);
    const inputs = screen.getAllByRole('textbox');

    VALID_WORDS.forEach((word, i) => {
      fireEvent.change(inputs[i], { target: { value: word } });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(mockSetSrpMnemonic).toHaveBeenCalledWith(VALID_MNEMONIC);
    expect(mockOnNext).toHaveBeenCalled();
  });

  it('calls onPrev when Back button is clicked', () => {
    render(<EnterSecretRecoveryPhrase />);
    fireEvent.click(screen.getByTestId('back-btn'));
    expect(mockOnPrev).toHaveBeenCalled();
  });

  it('displays srpError banner when srpError is set', () => {
    mockContextValue = {
      ...mockContextValue,
      srpError: 'Please review your input and try again.',
    };
    render(<EnterSecretRecoveryPhrase />);
    expect(
      screen.getByText('Invalid Secret Recovery Phrase'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Please review your input and try again.'),
    ).toBeInTheDocument();
  });

  it('clears srpError when a word input changes', () => {
    mockContextValue = {
      ...mockContextValue,
      srpError: 'Some error',
    };
    render(<EnterSecretRecoveryPhrase />);
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'test' } });
    expect(mockSetSrpError).toHaveBeenCalledWith(undefined);
  });

  it('shows invalid phrase alert when all words are filled but mnemonic is invalid', () => {
    render(<EnterSecretRecoveryPhrase />);
    const inputs = screen.getAllByRole('textbox');

    // Fill all 12 inputs with invalid words
    inputs.forEach((input) => {
      fireEvent.change(input, { target: { value: 'invalid' } });
    });

    // Verify mnemonic is actually invalid
    expect(
      ethers.utils.isValidMnemonic(Array(12).fill('invalid').join(' ')),
    ).toBe(false);

    expect(
      screen.getByText('Invalid Secret Recovery Phrase'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Please review your input and try again.'),
    ).toBeInTheDocument();
  });

  it('handles paste of full 12-word phrase into first input', () => {
    render(<EnterSecretRecoveryPhrase />);
    const inputs = screen.getAllByRole('textbox');

    // Paste the full mnemonic into the first input (grid position 0 = word index 0)
    fireEvent.paste(inputs[0], {
      clipboardData: { getData: () => VALID_MNEMONIC },
    });

    const button = screen.getByRole('button', { name: 'Continue' });
    expect(button).not.toBeDisabled();
  });
});
