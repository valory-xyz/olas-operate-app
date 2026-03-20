import { fireEvent, render, screen } from '@testing-library/react';

// Import after mocks
import { Sidebar } from '../../../../components/MainPage/Sidebar/Sidebar';
import { PAGES, SETUP_SCREEN } from '../../../../constants';
import { DEFAULT_SERVICE_CONFIG_ID } from '../../../helpers/factories';

// jsdom does not provide ResizeObserver
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../../mocks/ethersMulticall').ethersMulticallMock,
);
jest.mock(
  'styled-components',
  () => require('../../../mocks/styledComponents').styledComponentsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../../constants/providers', () => ({}));
jest.mock('../../../../config/providers', () => ({}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => (
    <img {...props} alt={props.alt as string} />
  ),
}));

jest.mock('react-icons/tb', () => ({
  TbHelpSquareRounded: () => <span>help-icon</span>,
  TbPlus: () => <span>plus-icon</span>,
  TbSettings: () => <span>settings-icon</span>,
  TbWallet: () => <span>wallet-icon</span>,
  TbShieldHalfFilled: () => <span>shield-icon</span>,
}));

jest.mock('react-icons/fi', () => ({
  FiArrowUpRight: () => <span>arrow-up-right</span>,
}));

const mockGotoPage = jest.fn();
const mockGotoSetup = jest.fn();
const mockUpdateSelectedServiceConfigId = jest.fn();
const mockGetAgentTypeFromService = jest.fn();
const mockIsInstanceInitiallyFunded = jest.fn().mockReturnValue(true);

jest.mock('../../../../hooks', () => ({
  useServices: () => mockUseServices(),
  useAgentRunning: () => mockUseAgentRunning(),
  useMasterWalletContext: () => mockUseMasterWalletContext(),
  usePageState: () => ({
    pageState: PAGES.Main,
    goto: mockGotoPage,
  }),
  useSetup: () => ({ goto: mockGotoSetup }),
  useBalanceAndRefillRequirementsContext: () => ({
    isPearlWalletRefillRequired: false,
  }),
  useIsInitiallyFunded: () => ({
    isInstanceInitiallyFunded: mockIsInstanceInitiallyFunded,
  }),
}));

const mockUseServices = jest.fn();
const mockUseAgentRunning = jest.fn();
const mockUseMasterWalletContext = jest.fn();

jest.mock('../../../../components/MainPage/BackupSeedPhraseAlert', () => ({
  BackupSeedPhraseAlert: () => <div data-testid="backup-alert" />,
}));

jest.mock(
  '../../../../components/MainPage/UpdateAvailableAlert/UpdateAvailableAlert',
  () => ({
    UpdateAvailableAlert: () => <div data-testid="update-alert" />,
  }),
);

jest.mock(
  '../../../../components/MainPage/UpdateAvailableAlert/UpdateAvailableModal',
  () => ({
    UpdateAvailableModal: () => <div data-testid="update-modal" />,
  }),
);

jest.mock('../../../../components/MainPage/Sidebar/AgentTreeMenu', () => ({
  AgentTreeMenu: (props: {
    groups: Array<{
      agentType: string;
      instances: Array<{ serviceConfigId: string; name: string }>;
    }>;
  }) => (
    <div data-testid="agent-tree-menu">
      {props.groups.map((g) => (
        <div key={g.agentType} data-testid={`group-${g.agentType}`}>
          {g.instances.map((i) => (
            <div key={i.serviceConfigId}>{i.name}</div>
          ))}
        </div>
      ))}
    </div>
  ),
}));

jest.mock('../../../../components/MainPage/Sidebar/ArchiveAgentModal', () => ({
  ArchiveAgentModal: () => <div data-testid="archive-modal" />,
}));

jest.mock('../../../../components/MainPage/Sidebar/AutoRunControl', () => ({
  AutoRunControl: () => <div data-testid="auto-run-control" />,
}));

jest.mock('../../../../components/MainPage/hooks/useSidebarAgents', () => ({
  useSidebarAgents: () => ({
    pendingArchiveInstanceId: undefined,
    setPendingArchiveInstanceId: jest.fn(),
    pendingArchiveInstanceName: '',
    handleArchiveConfirm: jest.fn(),
    archivedInstances: [],
  }),
}));

const mockServiceWithConfig = (
  serviceConfigId: string,
  servicePublicId: string,
) => ({
  service_config_id: serviceConfigId,
  service_public_id: servicePublicId,
  name: 'Test Agent',
  description: 'Test',
  hash: 'bafybeib5hmzpf7cmxyfevq65tk22fjvlothjskw7nacgh4ervgs5mos7ra',
  hash_history: {},
  agent_release: {
    is_aea: true,
    repository: { owner: 'valory-xyz', name: 'trader', version: 'v0.31.7-rc2' },
  },
  home_chain: 'gnosis',
  keys: [],
  chain_configs: {},
  env_variables: {},
});

describe('Sidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseServices.mockReturnValue({
      services: [
        mockServiceWithConfig(
          DEFAULT_SERVICE_CONFIG_ID,
          'valory/trader_pearl:0.1.0',
        ),
      ],
      isLoading: false,
      selectedServiceConfigId: DEFAULT_SERVICE_CONFIG_ID,
      updateSelectedServiceConfigId: mockUpdateSelectedServiceConfigId,
      getAgentTypeFromService: mockGetAgentTypeFromService,
    });
    mockUseAgentRunning.mockReturnValue({
      runningServiceConfigId: null,
    });
    mockUseMasterWalletContext.mockReturnValue({
      isLoading: false,
    });
  });

  it('renders "My agents" header', () => {
    render(<Sidebar />);
    expect(screen.getByText('My agents')).toBeInTheDocument();
  });

  it('renders the "Add Agent" button', () => {
    render(<Sidebar />);
    expect(screen.getByText('Add Agent')).toBeInTheDocument();
  });

  it('navigates to setup on "Add Agent" click', () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByText('Add Agent'));
    expect(mockGotoPage).toHaveBeenCalledWith(PAGES.Setup);
    expect(mockGotoSetup).toHaveBeenCalledWith(SETUP_SCREEN.AgentOnboarding);
  });

  it('renders bottom menu items', () => {
    render(<Sidebar />);
    expect(screen.getByText('Help Center')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders loading skeleton when services are loading', () => {
    mockUseServices.mockReturnValue({
      services: [],
      isLoading: true,
      selectedServiceConfigId: null,
      updateSelectedServiceConfigId: mockUpdateSelectedServiceConfigId,
      getAgentTypeFromService: mockGetAgentTypeFromService,
    });

    const { container } = render(<Sidebar />);
    // Skeleton.Input renders ant-skeleton elements
    const skeletons = container.querySelectorAll('.ant-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders loading skeleton when master wallet is loading', () => {
    mockUseMasterWalletContext.mockReturnValue({ isLoading: true });

    const { container } = render(<Sidebar />);
    const skeletons = container.querySelectorAll('.ant-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders agent tree when services are loaded', () => {
    render(<Sidebar />);
    expect(screen.getByTestId('agent-tree-menu')).toBeInTheDocument();
  });

  it('renders support components', () => {
    render(<Sidebar />);
    expect(screen.getByTestId('backup-alert')).toBeInTheDocument();
    expect(screen.getByTestId('update-alert')).toBeInTheDocument();
    expect(screen.getByTestId('update-modal')).toBeInTheDocument();
  });

  it('renders auto-run control', () => {
    render(<Sidebar />);
    expect(screen.getByTestId('auto-run-control')).toBeInTheDocument();
  });

  it('renders no tree when there are no services', () => {
    mockUseServices.mockReturnValue({
      services: [],
      isLoading: false,
      selectedServiceConfigId: null,
      updateSelectedServiceConfigId: mockUpdateSelectedServiceConfigId,
      getAgentTypeFromService: mockGetAgentTypeFromService,
    });

    render(<Sidebar />);
    expect(screen.queryByTestId('agent-tree-menu')).not.toBeInTheDocument();
  });

  it('renders archive modal component', () => {
    render(<Sidebar />);
    expect(screen.getByTestId('archive-modal')).toBeInTheDocument();
  });
});
