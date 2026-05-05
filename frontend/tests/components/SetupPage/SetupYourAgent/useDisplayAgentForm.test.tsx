import { render, renderHook, screen } from '@testing-library/react';
import { act, createElement } from 'react';

import { AgentMap, AgentType } from '../../../../constants/agent';
import { SETUP_SCREEN } from '../../../../constants/setupScreen';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../../constants/providers', () => ({}));
jest.mock('../../../../config/providers', () => ({ providers: [] }));

// Mock BackButton from @/components/ui to avoid antd ESM import chain
jest.mock('../../../../components/ui', () => ({
  BackButton: ({ onPrev }: { onPrev?: () => void }) =>
    onPrev
      ? createElement('button', { onClick: onPrev }, 'Back')
      : createElement('div'),
}));

const mockGoto = jest.fn();

jest.mock('../../../../hooks', () => ({
  useSetup: jest.fn(() => ({ goto: mockGoto })),
  useServices: jest.fn(() => ({
    selectedAgentType: AgentMap.PredictTrader as AgentType,
    selectedAgentConfig: { displayName: 'Predict' },
  })),
}));

const MOCK_SERVICE_TEMPLATE = {
  agentType: AgentMap.PredictTrader,
  name: 'Predict Trader',
};

jest.mock('../../../../constants/serviceTemplates', () => ({
  SERVICE_TEMPLATES: [MOCK_SERVICE_TEMPLATE],
}));

// ---------------------------------------------------------------------------
// Typed mock accessors
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const { useSetup, useServices } = require('../../../../hooks') as {
  useSetup: jest.Mock;
  useServices: jest.Mock;
};

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

const { useDisplayAgentForm } =
  require('../../../../components/SetupPage/SetupYourAgent/useDisplayAgentForm') as typeof import('../../../../components/SetupPage/SetupYourAgent/useDisplayAgentForm');
/* eslint-enable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useDisplayAgentForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSetup.mockReturnValue({ goto: mockGoto });
    useServices.mockReturnValue({
      selectedAgentType: AgentMap.PredictTrader,
      selectedAgentConfig: { displayName: 'Predict' },
    });
  });

  it('returns a function (displayForm)', () => {
    const { result } = renderHook(() => useDisplayAgentForm());
    expect(typeof result.current).toBe('function');
  });

  it('displayForm returns null when no matching serviceTemplate', () => {
    useServices.mockReturnValue({
      selectedAgentType: 'non_existent_agent',
      selectedAgentConfig: { displayName: 'Nonexistent' },
    });

    const { result } = renderHook(() => useDisplayAgentForm());
    const output = result.current(
      createElement('div', null, 'form'),
      createElement('div', null, 'desc'),
    );
    expect(output).toBeNull();
  });

  it('displayForm renders form and description content', () => {
    const { result } = renderHook(() => useDisplayAgentForm());

    const Wrapper = () =>
      result.current(
        createElement('div', null, 'My Form Content'),
        createElement('div', null, 'My Description Content'),
      ) as React.ReactElement;

    render(createElement(Wrapper));

    expect(screen.getByText('My Form Content')).toBeInTheDocument();
    expect(screen.getByText('My Description Content')).toBeInTheDocument();
  });

  it('displayForm uses onBack callback when provided', () => {
    const onBack = jest.fn();
    const { result } = renderHook(() => useDisplayAgentForm());

    const Wrapper = () =>
      result.current(
        createElement('div', null, 'form'),
        createElement('div', null, 'desc'),
        { isUpdate: false, onBack },
      ) as React.ReactElement;

    render(createElement(Wrapper));

    // The BackButton component only renders the button when onPrev is truthy
    const backButton = screen.getByText('Back');
    act(() => {
      backButton.click();
    });

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(mockGoto).not.toHaveBeenCalled();
  });

  it('displayForm defaults to goto(SETUP_SCREEN.AgentOnboarding) when no onBack', () => {
    const { result } = renderHook(() => useDisplayAgentForm());

    const Wrapper = () =>
      result.current(
        createElement('div', null, 'form'),
        createElement('div', null, 'desc'),
      ) as React.ReactElement;

    render(createElement(Wrapper));

    const backButton = screen.getByText('Back');
    act(() => {
      backButton.click();
    });

    expect(mockGoto).toHaveBeenCalledWith(SETUP_SCREEN.AgentOnboarding);
  });

  it('displayForm shows "Agent Settings" title when isUpdate=true', () => {
    const { result } = renderHook(() => useDisplayAgentForm());

    const Wrapper = () =>
      result.current(
        createElement('div', null, 'form'),
        createElement('div', null, 'desc'),
        { isUpdate: true, onBack: undefined },
      ) as React.ReactElement;

    render(createElement(Wrapper));

    expect(screen.getByText('Agent Settings')).toBeInTheDocument();
  });

  it('displayForm shows agent name title when isUpdate=false', () => {
    const { result } = renderHook(() => useDisplayAgentForm());

    const Wrapper = () =>
      result.current(
        createElement('div', null, 'form'),
        createElement('div', null, 'desc'),
        { isUpdate: false, onBack: undefined },
      ) as React.ReactElement;

    render(createElement(Wrapper));

    expect(
      screen.getByText('Configure Your Predict Agent'),
    ).toBeInTheDocument();
  });
});
