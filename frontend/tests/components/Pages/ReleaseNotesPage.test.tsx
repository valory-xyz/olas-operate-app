import { render, screen } from '@testing-library/react';
import React from 'react';

import { ReleaseNotesPage } from '@/components/Pages/ReleaseNotesPage';
import { ACTIVE_AGENTS } from '@/config/agents';
import {
  AgentMap,
  AgentType,
  GITHUB_API_RELEASES,
  IPFS_GATEWAY_URL,
} from '@/constants';
import {
  AGENT_UI_RELEASES,
  SERVICE_TEMPLATES,
} from '@/constants/serviceTemplates';

import { makeService } from '../../helpers/factories';

const mockGoto = jest.fn();
const mockGetAppVersion = jest.fn();
let mockServices: ReturnType<typeof makeService>[] | undefined;

// The page imports from the '@/hooks' barrel; jest.mock resolves via the
// relative path (matching the convention in sibling component suites).
jest.mock('../../../hooks', () => ({
  useElectronApi: () => ({ getAppVersion: mockGetAppVersion }),
  usePageState: () => ({ goto: mockGoto }),
  useServices: () => ({ services: mockServices }),
}));

// Pearl embeds agent icons via next/image; the page logic under test does not
// depend on them, so render nothing to avoid the no-img-element lint rule.
jest.mock('next/image', () => ({
  __esModule: true,
  default: () => null,
}));

const APP_VERSION = '1.2.3';
const PEARL_RELEASE_URL = `${GITHUB_API_RELEASES}/tag/v${APP_VERSION}`;

/** Expected row data for every active agent, derived from the real configs. */
const EXPECTED_AGENTS = ACTIVE_AGENTS.map(([agentType, config]) => {
  const template = SERVICE_TEMPLATES.find((t) => t.agentType === agentType);
  if (!template) throw new Error(`No service template for ${agentType}`);
  const ui = AGENT_UI_RELEASES[agentType];
  if (!ui) throw new Error(`No agent UI release for ${agentType}`);
  const { owner, name, version } = template.agent_release.repository;
  return {
    agentType,
    displayName: config.displayName,
    service: makeService({
      service_public_id: config.servicePublicId,
      home_chain: config.middlewareHomeChainId,
    }),
    hashUrl: `${IPFS_GATEWAY_URL}${template.hash}`,
    agentUrl: `https://github.com/${owner}/${name}/releases/tag/${version}`,
    uiUrl: `https://github.com/${ui.owner}/${ui.name}/releases/tag/${ui.version}`,
  };
});

const hrefsOf = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('a')).map((a) =>
    a.getAttribute('href'),
  );

describe('ReleaseNotesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockServices = undefined;
    mockGetAppVersion.mockResolvedValue(APP_VERSION);
  });

  describe('AGENT_UI_RELEASES mapping', () => {
    it('sources every non-PettAi agent UI from agent-ui-monorepo', () => {
      (Object.keys(AGENT_UI_RELEASES) as AgentType[])
        .filter((agentType) => agentType !== AgentMap.PettAi)
        .forEach((agentType) =>
          expect(AGENT_UI_RELEASES[agentType]?.name).toBe('agent-ui-monorepo'),
        );
    });

    it('sources the PettAi UI from its own pettai-agent repo', () => {
      expect(AGENT_UI_RELEASES[AgentMap.PettAi]).toEqual({
        owner: 'valory-xyz',
        name: 'pettai-agent',
        version: 'v0.1.11',
      });
    });
  });

  it('renders the Pearl row with the app version and no agent rows', async () => {
    const { container } = render(<ReleaseNotesPage />);

    const pearlLink = await screen.findByRole('link', {
      name: `v${APP_VERSION}`,
    });
    expect(pearlLink).toHaveAttribute('href', PEARL_RELEASE_URL);
    expect(screen.getByText('Pearl')).toBeInTheDocument();

    // Only the Pearl release link is present when no services are configured.
    expect(hrefsOf(container)).toEqual([PEARL_RELEASE_URL]);
    expect(screen.queryByText('Agent UI')).not.toBeInTheDocument();
  });

  it('renders an agent and an agent-UI badge for every configured agent', async () => {
    mockServices = EXPECTED_AGENTS.map((a) => a.service);

    const { container } = render(<ReleaseNotesPage />);
    await screen.findByText('Pearl');

    EXPECTED_AGENTS.forEach((agent) => {
      expect(screen.getByText(agent.displayName)).toBeInTheDocument();
    });

    // One "Agent" + one "Agent UI" label per configured agent.
    expect(screen.getAllByText('Agent')).toHaveLength(EXPECTED_AGENTS.length);
    expect(screen.getAllByText('Agent UI')).toHaveLength(
      EXPECTED_AGENTS.length,
    );

    // Exact set of links: Pearl + (hash, agent release, UI release) per agent.
    const expectedHrefs = [
      PEARL_RELEASE_URL,
      ...EXPECTED_AGENTS.flatMap((a) => [a.hashUrl, a.agentUrl, a.uiUrl]),
    ];
    expect(hrefsOf(container).sort()).toEqual(expectedHrefs.sort());
  });

  it('only renders rows for agents that have a configured service', async () => {
    const predict = EXPECTED_AGENTS.find(
      (a) => a.agentType === AgentMap.PredictTrader,
    )!;
    mockServices = [predict.service];

    const { container } = render(<ReleaseNotesPage />);
    await screen.findByText('Pearl');

    expect(screen.getByText(predict.displayName)).toBeInTheDocument();
    EXPECTED_AGENTS.filter(
      (a) => a.agentType !== AgentMap.PredictTrader,
    ).forEach((a) =>
      expect(screen.queryByText(a.displayName)).not.toBeInTheDocument(),
    );

    expect(hrefsOf(container).sort()).toEqual(
      [
        PEARL_RELEASE_URL,
        predict.hashUrl,
        predict.agentUrl,
        predict.uiUrl,
      ].sort(),
    );
  });
});
