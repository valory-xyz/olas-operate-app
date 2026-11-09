import { fireEvent, render, screen } from '@testing-library/react';

import { BackupSignerGate } from '../../../components/SetupPage/BackupSignerGate';
import { useLatchedBackupSigner } from '../../../context/LatchedBackupSignerContext';

jest.mock('../../../constants/providers', () => ({ PROVIDERS: {} }));

const mockLatchedSigner = {
  state: 'ready',
  backupSignerAddress: '0x2222222222222222222222222222222222222222',
};
let mockGuard: { latchedSigner: unknown; isBackupSignerError: boolean };

jest.mock('../../../hooks', () => ({
  useBackupSignerGuard: () => mockGuard,
}));

jest.mock('../../../components/ui', () => ({
  CardSkeleton: () => <div data-testid="card-skeleton" />,
  BackButton: ({ onPrev }: { onPrev: () => void }) => (
    <button onClick={onPrev}>Back</button>
  ),
  cardStyles: {},
  Alert: ({ message }: { message?: React.ReactNode }) => (
    <div role="alert">{message}</div>
  ),
}));

const mockOnBack = jest.fn();

const Child = () => {
  const latched = useLatchedBackupSigner();
  return <div data-testid="child">{JSON.stringify(latched)}</div>;
};

describe('BackupSignerGate', () => {
  it('shows a loader while the backup signer is unsettled', () => {
    mockGuard = { latchedSigner: null, isBackupSignerError: false };
    render(
      <BackupSignerGate onBack={mockOnBack}>
        {() => <Child />}
      </BackupSignerGate>,
    );

    expect(screen.getByTestId('card-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
  });

  it('shows a retrying error when the Safe owners can not be read', () => {
    mockGuard = { latchedSigner: null, isBackupSignerError: true };
    render(
      <BackupSignerGate onBack={mockOnBack}>
        {() => <Child />}
      </BackupSignerGate>,
    );

    expect(
      screen.getByText(/Couldn.t check your backup wallet/),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
  });

  it("offers the screen's own Back on the error view", () => {
    mockGuard = { latchedSigner: null, isBackupSignerError: true };
    render(
      <BackupSignerGate onBack={mockOnBack}>
        {() => <Child />}
      </BackupSignerGate>,
    );

    fireEvent.click(screen.getByText('Back'));
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('renders children with the latched signer and shares it through the context', () => {
    mockGuard = {
      latchedSigner: mockLatchedSigner,
      isBackupSignerError: false,
    };
    const children = jest.fn(() => <Child />);
    render(<BackupSignerGate onBack={mockOnBack}>{children}</BackupSignerGate>);

    expect(children).toHaveBeenCalledWith(mockLatchedSigner);
    expect(screen.getByTestId('child')).toHaveTextContent(
      JSON.stringify(mockLatchedSigner),
    );
  });
});
