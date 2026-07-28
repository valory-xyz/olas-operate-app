import { fireEvent, render, screen } from '@testing-library/react';

// Import after mocks
import { FundYourAgent } from '../../../../components/SetupPage/FundYourAgent/FundYourAgent';
import { SETUP_SCREEN } from '../../../../constants';
import { EvmChainIdMap } from '../../../../constants/chains';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../../mocks/styledComponents').styledComponentsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../../constants/providers', () => ({ PROVIDERS: {} }));

const mockGotoSetup = jest.fn();
const mockResetTokenRequirements = jest.fn();
const mockUseServices = jest.fn();

jest.mock('../../../../hooks', () => ({
  // Disable both optional cards to keep the tree small.
  useFeatureFlag: () => [false, false],
  useSetup: () => ({ goto: mockGotoSetup }),
  useServices: () => mockUseServices(),
  useGetRefillRequirements: () => ({
    refillTokenRequirements: [{ symbol: 'OLAS', amount: 1 }],
    isLoading: false,
    resetTokenRequirements: mockResetTokenRequirements,
  }),
}));

jest.mock('../../../../components/ui', () => ({
  BackButton: ({ onPrev }: { onPrev: () => void }) => (
    <button data-testid="back-button" onClick={onPrev}>
      Back
    </button>
  ),
  CardFlex: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TokenRequirements: () => <div data-testid="token-requirements" />,
}));

jest.mock(
  '../../../../components/SetupPage/FundYourAgent/components/OnRampMethodCard',
  () => ({
    OnRampMethodCard: () => <div data-testid="on-ramp-method-card" />,
  }),
);

const setup = (defaultStakingProgramId?: string) => {
  mockUseServices.mockReturnValue({
    selectedAgentConfig: {
      evmHomeChainId: EvmChainIdMap.Gnosis,
      displayName: 'Connect',
      defaultStakingProgramId,
    },
  });
};

describe('FundYourAgent — Back button routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes back to AgentOnboarding for a no_staking agent (e.g. Connect)', () => {
    setup('no_staking');
    render(<FundYourAgent />);

    fireEvent.click(screen.getByTestId('back-button'));

    expect(mockResetTokenRequirements).toHaveBeenCalledTimes(1);
    expect(mockGotoSetup).toHaveBeenCalledWith(SETUP_SCREEN.AgentOnboarding);
  });

  it('routes back to SelectStaking for a staking agent', () => {
    setup('pearl_beta');
    render(<FundYourAgent />);

    fireEvent.click(screen.getByTestId('back-button'));

    expect(mockResetTokenRequirements).toHaveBeenCalledTimes(1);
    expect(mockGotoSetup).toHaveBeenCalledWith(SETUP_SCREEN.SelectStaking);
  });
});
