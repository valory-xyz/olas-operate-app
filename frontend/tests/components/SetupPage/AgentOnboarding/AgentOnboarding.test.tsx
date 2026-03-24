import { render, screen } from '@testing-library/react';

import { AgentOnboarding } from '../../../../components/SetupPage/AgentOnboarding/AgentOnboarding';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../../mocks/styledComponents').styledComponentsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

const mockUseSetup = jest.fn();
const mockUsePageState = jest.fn();
const mockUseServices = jest.fn();
const mockUseArchivedAgents = jest.fn();
const mockUseIsAgentGeoRestricted = jest.fn();

jest.mock('../../../../hooks', () => ({
  useSetup: (...args: unknown[]) => mockUseSetup(...args),
  usePageState: (...args: unknown[]) => mockUsePageState(...args),
  useServices: (...args: unknown[]) => mockUseServices(...args),
  useArchivedAgents: (...args: unknown[]) => mockUseArchivedAgents(...args),
  useIsAgentGeoRestricted: (...args: unknown[]) =>
    mockUseIsAgentGeoRestricted(...args),
}));

jest.mock('../../../../config/agents', () => ({
  AGENT_CONFIG: {
    trader: {
      isComingSoon: false,
      requiresSetup: true,
      isX402Enabled: false,
      isUnderConstruction: false,
      isGeoLocationRestricted: false,
    },
  },
}));

jest.mock('../../../../components/AgentIntroduction', () => ({
  AgentIntroduction: () => <div data-testid="agent-introduction" />,
}));

jest.mock('../../../../components/ui', () => ({
  Segmented: ({ value }: { value: string }) => (
    <div data-testid="segmented-value">{value}</div>
  ),
}));

jest.mock('../../../../components/ui/BackButton', () => ({
  BackButton: () => <div data-testid="back-button" />,
}));

jest.mock(
  '../../../../components/SetupPage/AgentOnboarding/FundingRequirementStep',
  () => ({
    FundingRequirementStep: () => (
      <div data-testid="funding-requirement-step" />
    ),
  }),
);

jest.mock(
  '../../../../components/SetupPage/AgentOnboarding/RestrictedRegion',
  () => ({
    RestrictedRegion: () => <div data-testid="restricted-region" />,
  }),
);

jest.mock(
  '../../../../components/SetupPage/AgentOnboarding/SelectAgent',
  () => ({
    AGENT_TAB: {
      New: 'new',
      Archived: 'archived',
    },
    SelectAgent: ({ activeTab }: { activeTab: string }) => (
      <div data-testid="select-agent-active-tab">{activeTab}</div>
    ),
  }),
);

describe('AgentOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSetup.mockReturnValue({ goto: jest.fn() });
    mockUsePageState.mockReturnValue({ goto: jest.fn() });
    mockUseServices.mockReturnValue({
      services: [
        {
          service_config_id: 'archived-1',
          service_public_id: 'valory/trader_pearl:0.1.0',
          home_chain: 100,
        },
      ],
      selectAgentTypeForSetup: jest.fn(),
      updateSelectedServiceConfigId: jest.fn(),
      getAgentTypeFromService: jest.fn(),
    });
    mockUseArchivedAgents.mockReturnValue({
      archivedInstances: ['archived-1'],
      unarchiveInstance: jest.fn(),
    });
    mockUseIsAgentGeoRestricted.mockReturnValue({
      isAgentGeoRestricted: false,
      isGeoLoading: false,
      isGeoError: false,
    });
  });

  it('keeps the new agents tab selected by default when archived instances exist', () => {
    render(<AgentOnboarding />);

    expect(screen.getByTestId('segmented-value')).toHaveTextContent('new');
    expect(screen.getByTestId('select-agent-active-tab')).toHaveTextContent(
      'new',
    );
  });
});
