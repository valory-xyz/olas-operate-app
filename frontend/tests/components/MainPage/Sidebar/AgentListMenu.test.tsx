import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { AgentListMenu } from '../../../../components/MainPage/Sidebar/AgentListMenu';
import { AgentType, Pages } from '../../../../constants';
import { AgentMap } from '../../../../constants/agent';
import { useAgentRunning } from '../../../../hooks';

jest.mock('../../../../constants/providers', () => ({}));

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../../mocks/styledComponents').styledComponentsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

// Render Dropdown menu items inline for interaction
jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  type DropdownProps = {
    children: React.ReactNode;
    menu?: {
      items?: {
        key: string;
        label: string;
        onClick?: (e: { domEvent: { stopPropagation: () => void } }) => void;
      }[];
    };
  };
  return {
    ...actual,
    Dropdown: ({ children, menu }: DropdownProps) => (
      <div>
        {children}
        {menu?.items?.map((item) => (
          <button
            key={item.key}
            onClick={() =>
              item.onClick?.({ domEvent: { stopPropagation: () => {} } })
            }
          >
            {item.label}
          </button>
        ))}
      </div>
    ),
  };
});

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, src }: { alt: string; src: string }) => (
    <img alt={alt} src={src} />
  ),
}));

jest.mock('../../../../components/MainPage/Sidebar/PulseDot', () => ({
  PulseDot: () => <span data-testid="pulse-dot" />,
}));

jest.mock('../../../../hooks', () => ({
  useAgentRunning: jest.fn(),
}));

const mockUseAgentRunning = useAgentRunning as jest.MockedFunction<
  typeof useAgentRunning
>;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const twoAgents = [
  {
    name: 'Agents.fun',
    agentType: AgentMap.AgentsFun,
    chainName: 'Base',
    chainId: 8453 as const,
  },
  {
    name: 'Omenstrat',
    agentType: AgentMap.PredictTrader,
    chainName: 'Gnosis',
    chainId: 100 as const,
  },
];

const onAgentSelect = jest.fn();
const onArchiveRequest = jest.fn();

const renderMenu = (
  agents = twoAgents,
  selectedMenuKeys: (AgentType | Pages)[] = [],
  runningAgentType: string | null = null,
) => {
  mockUseAgentRunning.mockReturnValue({
    runningAgentType,
  } as ReturnType<typeof useAgentRunning>);

  return render(
    <AgentListMenu
      myAgents={agents}
      selectedMenuKeys={selectedMenuKeys}
      onAgentSelect={onAgentSelect}
      onArchiveRequest={onArchiveRequest}
    />,
  );
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AgentListMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('agent names', () => {
    it('renders all agent names', () => {
      renderMenu();
      expect(screen.getByText('Agents.fun')).toBeInTheDocument();
      expect(screen.getByText('Omenstrat')).toBeInTheDocument();
    });

    it('renders agent icon images', () => {
      renderMenu();
      expect(screen.getByAltText('Agents.fun')).toBeInTheDocument();
      expect(screen.getByAltText('Omenstrat')).toBeInTheDocument();
    });
  });

  describe('label suffix — running agent', () => {
    it('shows PulseDot for the running agent', () => {
      renderMenu(twoAgents, [], AgentMap.AgentsFun);
      expect(screen.getByTestId('pulse-dot')).toBeInTheDocument();
    });

    it('does not show archive button for the running agent', () => {
      renderMenu(twoAgents, [], AgentMap.AgentsFun);
      expect(
        screen.queryByRole('button', { name: /Archive Agents\.fun/i }),
      ).not.toBeInTheDocument();
    });

    it('shows archive button for the stopped agent when another is running', () => {
      renderMenu(twoAgents, [], AgentMap.AgentsFun);
      expect(
        screen.getByRole('button', { name: /Archive Omenstrat/i }),
      ).toBeInTheDocument();
    });
  });

  describe('label suffix — multi-agent stopped', () => {
    it('shows archive button for both agents when none running', () => {
      renderMenu(twoAgents, [], null);
      expect(
        screen.getByRole('button', { name: /Archive Agents\.fun/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Archive Omenstrat/i }),
      ).toBeInTheDocument();
    });

    it('calls onArchiveRequest with the correct agentType on "Move to archive" click', () => {
      renderMenu(twoAgents, [], null);
      fireEvent.click(screen.getAllByText('Move to archive')[0]);
      expect(onArchiveRequest).toHaveBeenCalledWith(AgentMap.AgentsFun);
    });
  });

  describe('label suffix — single agent (chain logo)', () => {
    it('does not show archive button when only one agent', () => {
      renderMenu([twoAgents[0]], [], null);
      expect(
        screen.queryByRole('button', { name: /Archive Agents\.fun/i }),
      ).not.toBeInTheDocument();
    });

    it('shows the chain logo for the single agent', () => {
      renderMenu([twoAgents[0]], [], null);
      expect(screen.getByAltText('Base logo')).toBeInTheDocument();
    });
  });
});
