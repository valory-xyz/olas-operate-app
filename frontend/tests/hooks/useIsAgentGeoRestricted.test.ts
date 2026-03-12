import { renderHook, waitFor } from '@testing-library/react';

import { AgentMap } from '../../constants/agent';
import { useIsAgentGeoRestricted } from '../../hooks/useIsAgentGeoRestricted';
import { AgentConfig } from '../../types';
import { createQueryClientWrapper } from '../helpers/queryClient';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));

const geoRestrictedConfig = {
  isGeoLocationRestricted: true,
} as AgentConfig;

const nonGeoRestrictedConfig = {
  isGeoLocationRestricted: false,
} as AgentConfig;

describe('useIsAgentGeoRestricted', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns isAgentGeoRestricted=false when agentConfig.isGeoLocationRestricted is false', () => {
    const { result } = renderHook(
      () =>
        useIsAgentGeoRestricted({
          agentType: AgentMap.Polystrat,
          agentConfig: nonGeoRestrictedConfig,
        }),
      { wrapper: createQueryClientWrapper() },
    );

    expect(result.current.isAgentGeoRestricted).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns isAgentGeoRestricted=false when agentConfig is undefined', () => {
    const { result } = renderHook(
      () =>
        useIsAgentGeoRestricted({
          agentType: AgentMap.Polystrat,
          agentConfig: undefined,
        }),
      { wrapper: createQueryClientWrapper() },
    );
    expect(result.current.isAgentGeoRestricted).toBe(false);
  });

  it('returns isAgentGeoRestricted=true when geo API returns restricted', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          checked_at: Date.now(),
          eligibility: {
            [AgentMap.Polystrat]: { status: 'restricted' },
          },
        }),
    });

    const { result } = renderHook(
      () =>
        useIsAgentGeoRestricted({
          agentType: AgentMap.Polystrat,
          agentConfig: geoRestrictedConfig,
        }),
      { wrapper: createQueryClientWrapper() },
    );
    await waitFor(() => {
      expect(result.current.isAgentGeoRestricted).toBe(true);
    });
  });

  it('returns isAgentGeoRestricted=false when geo API returns allowed', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          checked_at: Date.now(),
          eligibility: {
            [AgentMap.Polystrat]: { status: 'allowed' },
          },
        }),
    });

    const { result } = renderHook(
      () =>
        useIsAgentGeoRestricted({
          agentType: AgentMap.Polystrat,
          agentConfig: geoRestrictedConfig,
        }),
      { wrapper: createQueryClientWrapper() },
    );
    await waitFor(() => {
      expect(result.current.isAgentGeoRestricted).toBe(false);
    });
  });

  it('returns isAgentGeoRestricted=false when agent type not in eligibility data', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          checked_at: Date.now(),
          eligibility: {
            someOtherAgent: { status: 'restricted' },
          },
        }),
    });

    const { result } = renderHook(
      () =>
        useIsAgentGeoRestricted({
          agentType: AgentMap.Polystrat,
          agentConfig: geoRestrictedConfig,
        }),
      { wrapper: createQueryClientWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isGeoLoading).toBe(false);
    });
    expect(result.current.isAgentGeoRestricted).toBe(false);
  });

  it('returns isGeoError=true when geo API fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(
      () =>
        useIsAgentGeoRestricted({
          agentType: AgentMap.Polystrat,
          agentConfig: geoRestrictedConfig,
        }),
      { wrapper: createQueryClientWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isGeoError).toBe(true);
    });
    // Permissive default: not restricted on error
    expect(result.current.isAgentGeoRestricted).toBe(false);
  });
});
