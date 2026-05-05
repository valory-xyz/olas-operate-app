import { fireEvent, render, screen, waitFor } from '@testing-library/react';
// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { Form } from 'antd';

import { PasswordForm } from '../../../../components/ui/forms/PasswordForm';
import { COLOR } from '../../../../constants/colors';

// ---------------------------------------------------------------------------
// matchMedia polyfill
// ---------------------------------------------------------------------------
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../../mocks/styledComponents').styledComponentsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

jest.mock('zxcvbn', () => ({
  __esModule: true,
  default: jest.fn((password: string) => {
    // Return predictable scores based on password length
    if (password.length <= 4) return { score: 0 };
    if (password.length <= 6) return { score: 1 };
    if (password.length <= 8) return { score: 2 };
    if (password.length <= 12) return { score: 3 };
    return { score: 4 };
  }),
}));

jest.mock('../../../../components/ui', () => ({
  Alert: ({
    type,
    message,
    showIcon,
    className,
  }: {
    type: string;
    message: string;
    showIcon: boolean;
    className: string;
  }) => (
    <div
      data-testid="alert"
      data-type={type}
      data-show-icon={showIcon}
      className={className}
    >
      {message}
    </div>
  ),
  BackButton: ({ onPrev }: { onPrev: () => void }) => (
    <button data-testid="back-button" onClick={onPrev}>
      Back
    </button>
  ),
  FormLabel: ({ children }: { children: React.ReactNode }) => (
    <label>{children}</label>
  ),
}));

jest.mock('../../../../components/ui/CardFlex', () => ({
  CardFlex: ({
    children,
    ...rest
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <div
      data-testid="card-flex"
      data-gap={rest.$gap}
      data-padding={rest.$padding}
    >
      {children}
    </div>
  ),
}));

// Wrapper component that provides the form instance
const PasswordFormWrapper = (
  props: Partial<Parameters<typeof PasswordForm>[0]>,
) => {
  const [form] = Form.useForm();
  return (
    <PasswordForm
      form={form}
      onFinish={jest.fn()}
      isSubmitting={false}
      onBack={jest.fn()}
      isPasswordValid={true}
      {...props}
    />
  );
};

describe('PasswordForm', () => {
  it('renders the default title', () => {
    render(<PasswordFormWrapper />);
    expect(screen.getByText('Set Password')).toBeInTheDocument();
  });

  it('renders a custom title', () => {
    render(<PasswordFormWrapper title="Reset Password" />);
    expect(screen.getByText('Reset Password')).toBeInTheDocument();
  });

  it('renders the password requirements text', () => {
    render(<PasswordFormWrapper />);
    expect(
      screen.getByText(/Your password must be at least 8 characters long./),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Use a mix of letters, numbers, and symbols./),
    ).toBeInTheDocument();
  });

  it('renders the default label', () => {
    render(<PasswordFormWrapper />);
    expect(screen.getByText('Enter password')).toBeInTheDocument();
  });

  it('renders a custom label', () => {
    render(<PasswordFormWrapper label="New password" />);
    expect(screen.getByText('New password')).toBeInTheDocument();
  });

  it('renders the Continue button', () => {
    render(<PasswordFormWrapper />);
    expect(
      screen.getByRole('button', { name: 'Continue' }),
    ).toBeInTheDocument();
  });

  it('renders the BackButton', () => {
    render(<PasswordFormWrapper />);
    expect(screen.getByTestId('back-button')).toBeInTheDocument();
  });

  it('calls onBack when BackButton is clicked', () => {
    const onBack = jest.fn();
    render(<PasswordFormWrapper onBack={onBack} />);
    fireEvent.click(screen.getByTestId('back-button'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('disables Continue when password is too short', async () => {
    render(<PasswordFormWrapper isPasswordValid={true} />);
    const input = screen.getByLabelText('Enter password');
    // Type a short password (< 8 chars)
    fireEvent.change(input, { target: { value: 'short' } });
    await waitFor(() => {
      const continueBtn = screen.getByRole('button', { name: 'Continue' });
      expect(continueBtn).toBeDisabled();
    });
  });

  it('disables Continue when isPasswordValid is false', async () => {
    render(<PasswordFormWrapper isPasswordValid={false} />);
    const input = screen.getByLabelText('Enter password');
    fireEvent.change(input, { target: { value: 'LongEnoughPassword!' } });
    await waitFor(() => {
      const continueBtn = screen.getByRole('button', { name: 'Continue' });
      expect(continueBtn).toBeDisabled();
    });
  });

  it('does not render info alert when info is not provided', () => {
    render(<PasswordFormWrapper />);
    expect(screen.queryByTestId('alert')).not.toBeInTheDocument();
  });

  it('renders info alert when info is provided', () => {
    render(<PasswordFormWrapper info="Important security info" />);
    expect(screen.getByTestId('alert')).toBeInTheDocument();
    expect(screen.getByText('Important security info')).toBeInTheDocument();
  });

  it('shows password strength when password is valid and non-empty', async () => {
    render(<PasswordFormWrapper isPasswordValid={true} />);
    const input = screen.getByLabelText('Enter password');
    fireEvent.change(input, { target: { value: 'MyPassword123!' } });
    await waitFor(() => {
      expect(screen.getByText(/Password strength:/)).toBeInTheDocument();
    });
  });

  it('does not show password strength when password is empty', () => {
    render(<PasswordFormWrapper isPasswordValid={true} />);
    expect(screen.queryByText(/Password strength:/)).not.toBeInTheDocument();
  });

  it('does not show password strength when isPasswordValid is false', async () => {
    render(<PasswordFormWrapper isPasswordValid={false} />);
    const input = screen.getByLabelText('Enter password');
    fireEvent.change(input, { target: { value: 'short' } });
    await waitFor(() => {
      expect(screen.queryByText(/Password strength:/)).not.toBeInTheDocument();
    });
  });

  it('shows loading state on Continue when isSubmitting is true', () => {
    render(<PasswordFormWrapper isSubmitting={true} />);
    const continueBtn = screen.getByRole('button', { name: /Continue/i });
    expect(continueBtn).toBeInTheDocument();
  });

  describe('password strength labels', () => {
    const strengthLabels = [
      { length: 4, label: 'Too weak' },
      { length: 6, label: 'Weak' },
      { length: 8, label: 'Moderate' },
      { length: 12, label: 'Strong' },
      { length: 16, label: 'Very strong! Nice job!' },
    ];

    it.each(strengthLabels)(
      'shows "$label" for password length $length',
      async ({ length, label }) => {
        render(<PasswordFormWrapper isPasswordValid={true} />);
        const input = screen.getByLabelText('Enter password');
        const password = 'A'.repeat(length);
        fireEvent.change(input, { target: { value: password } });
        await waitFor(() => {
          expect(screen.getByText(label)).toBeInTheDocument();
        });
      },
    );
  });

  describe('password strength colors', () => {
    const strengthColors = [
      { score: 0, color: COLOR.RED },
      { score: 1, color: COLOR.WARNING },
      { score: 2, color: COLOR.SUCCESS },
      { score: 3, color: COLOR.SUCCESS },
      { score: 4, color: COLOR.PURPLE },
    ];

    it.each(strengthColors)(
      'uses correct color for score $score',
      async ({ score, color }) => {
        // Map score to password length for mock
        const lengths = [4, 6, 8, 12, 16];
        const password = 'A'.repeat(lengths[score]);
        render(<PasswordFormWrapper isPasswordValid={true} />);
        const input = screen.getByLabelText('Enter password');
        fireEvent.change(input, { target: { value: password } });
        await waitFor(() => {
          const strengthSpan = screen
            .getByText(/Password strength:/)
            .querySelector('span');
          expect(strengthSpan).toHaveStyle({ color });
        });
      },
    );
  });
});
