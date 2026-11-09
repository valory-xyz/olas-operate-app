import { render, screen } from '@testing-library/react';

import { ForgotPasswordCard } from '../../../../components/AccountRecovery/components/RecoveryViaBackupWallet';

let mockIsWeb3AuthEnabled = true;

jest.mock(
  '../../../../components/AccountRecovery/AccountRecoveryProvider',
  () => ({
    useAccountRecoveryContext: () => ({
      onNext: jest.fn(),
      isWeb3AuthEnabled: mockIsWeb3AuthEnabled,
    }),
  }),
);

jest.mock('../../../../components/ui', () => ({
  CardFlex: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  IconContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../../mocks/styledComponents').styledComponentsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

describe('ForgotPasswordCard', () => {
  it('mentions the backup wallet when Web3Auth is enabled', () => {
    mockIsWeb3AuthEnabled = true;
    render(<ForgotPasswordCard />);
    expect(
      screen.getByText(
        'Reset your password using the secret recovery phrase or the backup wallet.',
      ),
    ).toBeInTheDocument();
  });

  it('mentions only the recovery phrase when Web3Auth is disabled', () => {
    mockIsWeb3AuthEnabled = false;
    render(<ForgotPasswordCard />);
    expect(
      screen.getByText('Reset your password using the secret recovery phrase.'),
    ).toBeInTheDocument();
  });
});
