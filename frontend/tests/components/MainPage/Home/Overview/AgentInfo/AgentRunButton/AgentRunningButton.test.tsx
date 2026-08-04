import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';

import { AgentRunningButton } from '../../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentRunButton/AgentRunningButton';
import { FIVE_SECONDS_INTERVAL } from '../../../../../../../constants';
import { MiddlewareDeploymentStatusMap } from '../../../../../../../constants/deployment';
import { REACT_QUERY_KEYS } from '../../../../../../../constants/reactQueryKeys';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  makeService,
} from '../../../../../../helpers/factories';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../../../../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../../../../../constants/providers', () => ({
  PROVIDERS: {},
}));

const mockRefetchQueries = jest.fn().mockResolvedValue(undefined);
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ refetchQueries: mockRefetchQueries }),
}));

const mockShowNotification = jest.fn();
jest.mock('../../../../../../../hooks/useElectronApi', () => ({
  useElectronApi: () => ({ showNotification: mockShowNotification }),
}));

const mockOverrideSelectedServiceStatus = jest.fn();
const mockSetPaused = jest.fn();
const defaultService = makeService({
  service_config_id: DEFAULT_SERVICE_CONFIG_ID,
  deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
});

jest.mock('../../../../../../../hooks/useServices', () => ({
  useServices: () => ({
    selectedService: defaultService,
    overrideSelectedServiceStatus: mockOverrideSelectedServiceStatus,
    setPaused: mockSetPaused,
  }),
}));

const mockStopDeployment = jest
  .fn()
  .mockResolvedValue({ status: 'stopped', nodes: [] });
jest.mock('../../../../../../../service/Services', () => ({
  ServicesService: {
    stopDeployment: (...args: unknown[]) => mockStopDeployment(...args),
  },
}));

describe('AgentRunningButton', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockStopDeployment.mockResolvedValue({ status: 'stopped', nodes: [] });
    mockRefetchQueries.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the Pause Agent button', () => {
    render(<AgentRunningButton />);
    expect(
      screen.getByRole('button', { name: 'Pause Agent' }),
    ).toBeInTheDocument();
  });

  it('calls stopDeployment when Pause Agent is clicked', async () => {
    render(<AgentRunningButton />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Pause Agent' }));
    });
    expect(mockStopDeployment).toHaveBeenCalledWith(DEFAULT_SERVICE_CONFIG_ID);
  });

  it('sets STOPPING override and pauses before stop API call', async () => {
    render(<AgentRunningButton />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Pause Agent' }));
    });
    expect(mockSetPaused).toHaveBeenCalledWith(true);
    expect(mockOverrideSelectedServiceStatus).toHaveBeenCalledWith(
      MiddlewareDeploymentStatusMap.STOPPING,
    );
  });

  it('calls refetchQueries before overrideSelectedServiceStatus(null) after timeout', async () => {
    const callOrder: string[] = [];
    mockRefetchQueries.mockImplementation(async () => {
      callOrder.push('refetchQueries');
    });
    mockOverrideSelectedServiceStatus.mockImplementation((val: unknown) => {
      if (val === null) callOrder.push('overrideNull');
    });

    render(<AgentRunningButton />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Pause Agent' }));
    });

    // Advance past the 5-second timeout
    await act(async () => {
      jest.advanceTimersByTime(FIVE_SECONDS_INTERVAL);
    });

    // Wait for the async setTimeout callback to resolve
    await waitFor(() => {
      expect(mockOverrideSelectedServiceStatus).toHaveBeenCalledWith(null);
    });

    expect(mockRefetchQueries).toHaveBeenCalledWith({
      queryKey: REACT_QUERY_KEYS.ALL_SERVICE_DEPLOYMENTS_KEY,
    });

    // refetchQueries must be called before the override is cleared
    expect(callOrder).toEqual(['refetchQueries', 'overrideNull']);
  });

  it('clears override even when stopDeployment throws', async () => {
    mockStopDeployment.mockRejectedValue(new Error('network error'));

    render(<AgentRunningButton />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Pause Agent' }));
    });

    expect(mockShowNotification).toHaveBeenCalledWith(
      'Error while stopping agent',
    );

    await act(async () => {
      jest.advanceTimersByTime(FIVE_SECONDS_INTERVAL);
    });

    await waitFor(() => {
      expect(mockOverrideSelectedServiceStatus).toHaveBeenCalledWith(null);
    });

    expect(mockRefetchQueries).toHaveBeenCalled();
  });

  it('clears override even when refetchQueries rejects', async () => {
    mockRefetchQueries.mockRejectedValue(new Error('refetch failed'));

    render(<AgentRunningButton />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Pause Agent' }));
    });

    await act(async () => {
      jest.advanceTimersByTime(FIVE_SECONDS_INTERVAL);
    });

    await waitFor(() => {
      expect(mockOverrideSelectedServiceStatus).toHaveBeenCalledWith(null);
    });
  });
});
