import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  AgentType,
  GEO_ELIGIBILITY_API_URL,
  REACT_QUERY_KEYS,
} from '@/constants';
import { AgentConfig } from '@/types';

type GeoEligibilityResponse = {
  checked_at: number;
  eligibility: {
    [key: string]: {
      status: 'allowed' | 'restricted';
    };
  };
};

const fetchGeoEligibility = async (
  signal: AbortSignal,
): Promise<GeoEligibilityResponse> => {
  const response = await fetch(GEO_ELIGIBILITY_API_URL, {
    method: 'GET',
    headers: { accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch geo eligibility: ${response.status}`);
  }

  return response.json();
};

type UseGeoEligibilityProps = {
  agentType?: AgentType;
  enabled?: boolean;
};

const useGeoEligibility = ({
  agentType,
  enabled = false,
}: UseGeoEligibilityProps) => {
  return useQuery({
    queryKey: REACT_QUERY_KEYS.GEO_ELIGIBILITY_KEY(agentType),
    queryFn: async ({ signal }) => {
      const data = await fetchGeoEligibility(signal);
      return data;
    },
    enabled: enabled && !!agentType,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });
};

type UseIsAgentGeoRestrictedProps = {
  agentType?: AgentType;
  agentConfig?: AgentConfig;
};

/**
 * Hook to check if an agent is geo-restricted in the current region.
 * Handles the logic of checking geo eligibility data and determining restriction status.
 *
 * @returns Object containing restriction status and loading/error states
 */
export const useIsAgentGeoRestricted = ({
  agentType,
  agentConfig,
}: UseIsAgentGeoRestrictedProps) => {
  const {
    data: geoData,
    isLoading: isGeoLoading,
    isError: isGeoError,
  } = useGeoEligibility({
    agentType,
    enabled: agentConfig?.isGeoLocationRestricted,
  });

  const isAgentGeoRestricted = useMemo(() => {
    if (!agentConfig?.isGeoLocationRestricted) return false;
    if (!geoData) return false;

    const agentEligibility = geoData.eligibility[agentType || ''];
    if (!agentEligibility) return false;

    return agentEligibility.status !== 'allowed';
  }, [agentType, geoData, agentConfig]);

  return {
    isAgentGeoRestricted,
    isGeoLoading,
    isGeoError,
    geoData,
  };
};
