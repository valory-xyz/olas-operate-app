/**
 * Tests for URL constants.
 *
 * Several URLs are environment-dependent: BACKEND_URL and BACKEND_URL_V2 use
 * port 8765 in production and 8000 in development. Getting these wrong
 * causes backend connectivity failures.
 *
 * Static URLs are validated to ensure they start with https:// and follow
 * the expected structure (correct host, path format).
 */

import {
  MiddlewareChainMap,
  SupportedMiddlewareChain,
  SupportedMiddlewareChainMap,
} from '../../constants/chains';

// We need the multicall mock because urls.ts imports from ./chains which
// transitively loads constants/providers.ts.
jest.mock(
  'ethers-multicall',
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../mocks/ethersMulticall').ethersMulticallMock,
);

// ─── Environment-dependent URLs ───────────────────────────────────────────────

describe('BACKEND_URL — environment-dependent port', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    Object.assign(process.env, { NODE_ENV: originalNodeEnv });
    jest.resetModules();
  });

  it('uses port 8000 in development', () => {
    Object.assign(process.env, { NODE_ENV: 'development' });
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { BACKEND_URL } = require('../../constants/urls');
    expect(BACKEND_URL).toBe('https://localhost:8000/api');
  });

  it('uses port 8765 in production', () => {
    Object.assign(process.env, { NODE_ENV: 'production' });
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { BACKEND_URL } = require('../../constants/urls');
    expect(BACKEND_URL).toBe('https://localhost:8765/api');
  });
});

describe('BACKEND_URL_V2 — environment-dependent port', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    Object.assign(process.env, { NODE_ENV: originalNodeEnv });
    jest.resetModules();
  });

  it('uses port 8000 in development', () => {
    Object.assign(process.env, { NODE_ENV: 'development' });
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { BACKEND_URL_V2 } = require('../../constants/urls');
    expect(BACKEND_URL_V2).toBe('https://localhost:8000/api/v2');
  });

  it('uses port 8765 in production', () => {
    Object.assign(process.env, { NODE_ENV: 'production' });
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { BACKEND_URL_V2 } = require('../../constants/urls');
    expect(BACKEND_URL_V2).toBe('https://localhost:8765/api/v2');
  });
});

// ─── Static URLs ─────────────────────────────────────────────────────────────

describe('static URL constants', () => {
  // Import after any env resets to get a stable snapshot
  let urls: typeof import('../../constants/urls');

  beforeAll(async () => {
    urls = await import('../../constants/urls');
  });

  it('PEARL_URL points to pearl.you', () => {
    expect(urls.PEARL_URL).toBe('https://www.pearl.you');
  });

  it('FAQ_URL is anchored from PEARL_URL', () => {
    expect(urls.FAQ_URL).toBe('https://www.pearl.you#FAQ');
  });

  it('DOWNLOAD_URL is anchored from PEARL_URL', () => {
    expect(urls.DOWNLOAD_URL).toBe('https://www.pearl.you#update');
  });

  it('TERMS_AND_CONDITIONS_URL points to olas.network', () => {
    expect(urls.TERMS_AND_CONDITIONS_URL).toContain('olas.network');
  });

  it('PEARL_API_URL is the correct production API host', () => {
    expect(urls.PEARL_API_URL).toBe('https://pearl-api.olas.network');
  });

  it('SUPPORT_API_URL is derived from PEARL_API_URL', () => {
    expect(urls.SUPPORT_API_URL).toBe(
      'https://pearl-api.olas.network/api/zendesk',
    );
  });

  it('GEO_ELIGIBILITY_API_URL is derived from PEARL_API_URL', () => {
    expect(urls.GEO_ELIGIBILITY_API_URL).toBe(
      'https://pearl-api.olas.network/api/geo/agent-eligibility',
    );
  });

  it('MOONPAY_SIGN_URL is derived from PEARL_API_URL', () => {
    expect(urls.MOONPAY_SIGN_URL).toBe(
      'https://pearl-api.olas.network/api/moonpay/sign',
    );
  });

  it('MOONPAY_QUOTE_URL is derived from PEARL_API_URL', () => {
    expect(urls.MOONPAY_QUOTE_URL).toBe(
      'https://pearl-api.olas.network/api/moonpay/quote',
    );
  });

  it('GITHUB_API_LATEST_RELEASE points to the correct repo', () => {
    expect(urls.GITHUB_API_LATEST_RELEASE).toBe(
      'https://api.github.com/repos/valory-xyz/olas-operate-app/releases/latest',
    );
  });

  it('WEB3AUTH_LOGIN_URL is derived from WEB3AUTH_GATEWAY_URL', () => {
    expect(urls.WEB3AUTH_LOGIN_URL).toBe(
      'https://pearl-api.olas.network/web3auth/login',
    );
  });

  it('WEB3AUTH_SWAP_OWNER_URL is derived from WEB3AUTH_GATEWAY_URL', () => {
    expect(urls.WEB3AUTH_SWAP_OWNER_URL).toBe(
      'https://pearl-api.olas.network/web3auth/swap-owner-session',
    );
  });

  it('PREDICT_WEBSITE_URL points to predict.olas.network', () => {
    expect(urls.PREDICT_WEBSITE_URL).toBe('https://predict.olas.network');
  });

  it('GOVERN_APP_URL points to govern.olas.network', () => {
    expect(urls.GOVERN_APP_URL).toBe('https://govern.olas.network');
  });
});

// ─── Per-chain URL maps ───────────────────────────────────────────────────────

describe('REWARDS_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN', () => {
  let urls: typeof import('../../constants/urls');

  beforeAll(async () => {
    urls = await import('../../constants/urls');
  });

  it('has an entry for all 5 supported EVM chains', () => {
    for (const chainId of [100, 8453, 34443, 10, 137]) {
      expect(
        urls.REWARDS_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN[chainId as never],
      ).toBeDefined();
    }
  });

  it('covers exactly 5 chains', () => {
    expect(
      Object.keys(urls.REWARDS_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN),
    ).toHaveLength(5);
  });

  it('all subgraph URLs contain "autonolas.tech"', () => {
    for (const url of Object.values(
      urls.REWARDS_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN,
    )) {
      expect(url).toContain('autonolas.tech');
    }
  });

  it('Gnosis subgraph URL contains "gnosis"', () => {
    expect(urls.REWARDS_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN[100]).toContain(
      'gnosis',
    );
  });

  it('Base subgraph URL contains "base"', () => {
    expect(urls.REWARDS_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN[8453]).toContain(
      'base',
    );
  });
});

describe('EXPLORER_URL_BY_MIDDLEWARE_CHAIN', () => {
  let urls: typeof import('../../constants/urls');

  beforeAll(async () => {
    urls = await import('../../constants/urls');
  });

  it('has an entry for every supported middleware chain', () => {
    for (const chain of Object.values(
      SupportedMiddlewareChainMap,
    ) as SupportedMiddlewareChain[]) {
      expect(urls.EXPLORER_URL_BY_MIDDLEWARE_CHAIN[chain]).toBeDefined();
    }
  });

  it('no explorer URL ends with a trailing slash (would break address append)', () => {
    for (const url of Object.values(urls.EXPLORER_URL_BY_MIDDLEWARE_CHAIN)) {
      expect(url.endsWith('/')).toBe(false);
    }
  });

  it('Gnosis explorer is gnosisscan.io', () => {
    expect(
      urls.EXPLORER_URL_BY_MIDDLEWARE_CHAIN[MiddlewareChainMap.GNOSIS],
    ).toBe('https://gnosisscan.io');
  });

  it('Base explorer is basescan.org', () => {
    expect(urls.EXPLORER_URL_BY_MIDDLEWARE_CHAIN[MiddlewareChainMap.BASE]).toBe(
      'https://basescan.org',
    );
  });

  it('Optimism explorer is optimistic.etherscan.io', () => {
    expect(
      urls.EXPLORER_URL_BY_MIDDLEWARE_CHAIN[MiddlewareChainMap.OPTIMISM],
    ).toBe('https://optimistic.etherscan.io');
  });

  it('Polygon explorer is polygonscan.com', () => {
    expect(
      urls.EXPLORER_URL_BY_MIDDLEWARE_CHAIN[MiddlewareChainMap.POLYGON],
    ).toBe('https://polygonscan.com');
  });
});

describe('BLOCKSCOUT_URL_BY_MIDDLEWARE_CHAIN', () => {
  let urls: typeof import('../../constants/urls');

  beforeAll(async () => {
    urls = await import('../../constants/urls');
  });

  it('has an entry for every supported middleware chain', () => {
    for (const chain of Object.values(
      SupportedMiddlewareChainMap,
    ) as SupportedMiddlewareChain[]) {
      expect(urls.BLOCKSCOUT_URL_BY_MIDDLEWARE_CHAIN[chain]).toBeDefined();
    }
  });

  it('covers exactly 5 chains', () => {
    expect(Object.keys(urls.BLOCKSCOUT_URL_BY_MIDDLEWARE_CHAIN)).toHaveLength(
      5,
    );
  });

  it('all Blockscout URLs contain "blockscout" or "explorer"', () => {
    for (const url of Object.values(urls.BLOCKSCOUT_URL_BY_MIDDLEWARE_CHAIN)) {
      expect(url.includes('blockscout') || url.includes('explorer')).toBe(true);
    }
  });
});
