import { useQuery } from '@tanstack/react-query';

import { AgentType, REACT_QUERY_KEYS } from '@/constants';

type GeoEligibilityResponse = {
  checked_at: number;
  geo: { source: 'vercel' | 'unknown' };
  eligibility: {
    [key: string]: {
      status: 'allowed' | 'restricted';
    };
  };
};

const GEO_ELIGIBILITY_API_URL =
  'https://pearl-api-git-mohandas-ope-1195-technical-scop-4bfa36-autonolas.vercel.app/api/geo/agent-eligibility';

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

// const mockData: GeoEligibilityResponse = {
//   checked_at: 1697059200,
//   geo: { source: 'vercel' },
//   eligibility: {
//     trader_polymarket: { status: 'restricted' },
//   },
// };

export const useGeoEligibility = ({
  agentType,
  enabled = true,
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

/**
 * Check if an agent is eligible in the current region
 */
export const isAgentEligibleInRegion = (
  agentId: string,
  geoData: GeoEligibilityResponse | undefined,
): boolean | null => {
  if (!geoData) return null;

  const agentEligibility = geoData.eligibility[agentId];
  if (!agentEligibility) return null;

  return agentEligibility.status === 'allowed';
};
