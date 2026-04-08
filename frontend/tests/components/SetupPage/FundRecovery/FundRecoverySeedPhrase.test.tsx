import { fireEvent, render, screen } from '@testing-library/react';

import { FundRecoverySeedPhrase } from '../../../../components/SetupPage/FundRecovery/FundRecoverySeedPhrase';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../../mocks/styledComponents').styledComponentsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

jest.mock('../../../../components/ui', () => ({
  Alert: ({
    message,
    description,
    type,
  }: {
    message?: string;
    description?: string;
    type?: string;
  }) => (
    <div data-testid="alert" data-type={type}>
      {message && <span>{message}</span>}
      {description && <span>{description}</span>}
    </div>
  ),
}));

jest.mock('ethers', () => ({
  ethers: {
    utils: {
      isValidMnemonic: jest.fn((phrase: string) => {
        const VALID =
          'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
        return phrase.trim() === VALID;
      }),
    },
  },
}));

const EMPTY_WORDS = Array.from({ length: 12 }, () => '');
const VALID_WORDS = [
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'about',
];

const defaultProps = {
  words: EMPTY_WORDS,
  isScanning: false,
  scanError: false,
  onWordsChange: jest.fn(),
  onScan: jest.fn(),
};

describe('FundRecoverySeedPhrase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial rendering', () => {
    it('renders the title "Withdraw Funds"', () => {
      render(<FundRecoverySeedPhrase {...defaultProps} />);
      expect(screen.getByText('Withdraw Funds')).toBeInTheDocument();
    });

    it('renders 12 word input boxes', () => {
      render(<FundRecoverySeedPhrase {...defaultProps} />);
      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(12);
    });

    it('renders the Continue button', () => {
      render(<FundRecoverySeedPhrase {...defaultProps} />);
      expect(
        screen.getByRole('button', { name: 'Continue' }),
      ).toBeInTheDocument();
    });
  });

  describe('Continue button disabled state', () => {
    it('is disabled when all words are empty', () => {
      render(<FundRecoverySeedPhrase {...defaultProps} words={EMPTY_WORDS} />);
      expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    });

    it('is disabled when some words are empty', () => {
      const partial = [...VALID_WORDS];
      partial[5] = '';
      render(<FundRecoverySeedPhrase {...defaultProps} words={partial} />);
      expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    });

    it('is enabled when all 12 words are filled', () => {
      render(<FundRecoverySeedPhrase {...defaultProps} words={VALID_WORDS} />);
      expect(
        screen.getByRole('button', { name: 'Continue' }),
      ).not.toBeDisabled();
    });

    it('is disabled when all words are filled but mnemonic is invalid', () => {
      const invalidWords = Array.from({ length: 12 }, () => 'notaword');
      render(<FundRecoverySeedPhrase {...defaultProps} words={invalidWords} />);
      expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    });
  });

  describe('scan error alert', () => {
    it('does not show an alert when scanError is false', () => {
      render(<FundRecoverySeedPhrase {...defaultProps} scanError={false} />);
      expect(screen.queryByTestId('alert')).not.toBeInTheDocument();
    });

    it('shows an error alert when scanError is true', () => {
      render(<FundRecoverySeedPhrase {...defaultProps} scanError={true} />);
      expect(screen.getByTestId('alert')).toBeInTheDocument();
      expect(
        screen.getByText(/Invalid Secret Recovery Phrase/i),
      ).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows a loading state on Continue button while scanning', () => {
      render(
        <FundRecoverySeedPhrase
          {...defaultProps}
          words={VALID_WORDS}
          isScanning={true}
        />,
      );
      // Loading button is still rendered but shows spinner
      const button = screen.getByRole('button', { name: /Continue/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('word input interaction', () => {
    it('calls onWordsChange when a word input changes', () => {
      const onWordsChange = jest.fn();
      render(
        <FundRecoverySeedPhrase
          {...defaultProps}
          onWordsChange={onWordsChange}
        />,
      );

      const inputs = screen.getAllByRole('textbox');
      fireEvent.change(inputs[0], { target: { value: 'abandon' } });

      expect(onWordsChange).toHaveBeenCalledTimes(1);
      const updatedWords = onWordsChange.mock.calls[0][0];
      expect(updatedWords[0]).toBe('abandon');
    });

    it('calls onScan when Continue is clicked with all words filled', () => {
      const onScan = jest.fn();
      render(
        <FundRecoverySeedPhrase
          {...defaultProps}
          words={VALID_WORDS}
          onScan={onScan}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
      expect(onScan).toHaveBeenCalledTimes(1);
    });
  });

  describe('paste handling', () => {
    it('distributes pasted words starting from index 0', () => {
      const onWordsChange = jest.fn();
      render(
        <FundRecoverySeedPhrase
          {...defaultProps}
          onWordsChange={onWordsChange}
        />,
      );

      const inputs = screen.getAllByRole('textbox');
      const pasteData = VALID_WORDS.join(' ');

      fireEvent.paste(inputs[0], {
        clipboardData: { getData: () => pasteData },
      });

      expect(onWordsChange).toHaveBeenCalledTimes(1);
      const updatedWords: string[] = onWordsChange.mock.calls[0][0];
      expect(updatedWords).toHaveLength(12);
      // After paste from index 0, all 12 words should be populated in order
      VALID_WORDS.forEach((word, i) => {
        expect(updatedWords[i]).toBe(word);
      });
    });
  });

  describe('handleKeyDown — focus advancement', () => {
    it('advances focus to the next input when Space is pressed', () => {
      render(<FundRecoverySeedPhrase {...defaultProps} />);
      const inputs = screen.getAllByRole('textbox');

      // Focus first input and press Space
      inputs[0].focus();
      fireEvent.keyDown(inputs[0], { key: ' ' });

      // The second input should be focused (index 1 in grid)
      expect(document.activeElement).toBe(inputs[1]);
    });

    it('advances focus to the next input when Enter is pressed', () => {
      render(<FundRecoverySeedPhrase {...defaultProps} />);
      const inputs = screen.getAllByRole('textbox');

      inputs[0].focus();
      fireEvent.keyDown(inputs[0], { key: 'Enter' });

      expect(document.activeElement).toBe(inputs[1]);
    });

    it('does not throw when Space is pressed on the last input', () => {
      render(<FundRecoverySeedPhrase {...defaultProps} />);
      const inputs = screen.getAllByRole('textbox');
      const lastInput = inputs[inputs.length - 1];

      lastInput.focus();
      expect(() => {
        fireEvent.keyDown(lastInput, { key: ' ' });
      }).not.toThrow();
    });

    it('does not throw when Enter is pressed on the last input', () => {
      render(<FundRecoverySeedPhrase {...defaultProps} />);
      const inputs = screen.getAllByRole('textbox');
      const lastInput = inputs[inputs.length - 1];

      lastInput.focus();
      expect(() => {
        fireEvent.keyDown(lastInput, { key: 'Enter' });
      }).not.toThrow();
    });
  });
});
