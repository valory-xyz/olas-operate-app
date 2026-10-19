import { renderHook } from '@testing-library/react';

import { AgentMap } from '../../constants/agent';
import { useChatCostNote } from '../../hooks/useChatCostNote';
import { PearlStore } from '../../types/ElectronApi';

const mockStoreSet = jest.fn();
let mockStoreState: PearlStore | undefined;

jest.mock('../../hooks/useElectronApi', () => ({
  useElectronApi: () => ({ store: { set: mockStoreSet } }),
}));

jest.mock('../../hooks/useStore', () => ({
  useStore: () => ({ storeState: mockStoreState }),
}));

const SERVICE_CONFIG_ID = 'sc-1';

describe('useChatCostNote', () => {
  beforeEach(() => {
    mockStoreSet.mockReset();
    mockStoreState = {};
  });

  it('shows the note on the first Send to an agent', () => {
    const { result } = renderHook(() =>
      useChatCostNote(AgentMap.Polystrat, SERVICE_CONFIG_ID),
    );

    expect(result.current.shouldShowCostNote).toBe(true);
  });

  it('does not show the note again once it was seen for that agent', () => {
    mockStoreState = {
      [AgentMap.Polystrat]: {
        isInitialFunded: true,
        chatCostNoteSeen: { [SERVICE_CONFIG_ID]: true },
      },
    };

    const { result } = renderHook(() =>
      useChatCostNote(AgentMap.Polystrat, SERVICE_CONFIG_ID),
    );

    expect(result.current.shouldShowCostNote).toBe(false);
  });

  it('still shows the note for another agent instance', () => {
    mockStoreState = {
      [AgentMap.Polystrat]: {
        isInitialFunded: true,
        chatCostNoteSeen: { 'sc-other': true },
      },
    };

    const { result } = renderHook(() =>
      useChatCostNote(AgentMap.Polystrat, SERVICE_CONFIG_ID),
    );

    expect(result.current.shouldShowCostNote).toBe(true);
  });

  it('waits for the store before showing the note', () => {
    mockStoreState = undefined;

    const { result } = renderHook(() =>
      useChatCostNote(AgentMap.Polystrat, SERVICE_CONFIG_ID),
    );

    expect(result.current.shouldShowCostNote).toBe(false);
  });

  it('persists the seen flag per agent instance, keeping the others', () => {
    mockStoreState = {
      [AgentMap.Optimus]: {
        isInitialFunded: true,
        chatCostNoteSeen: { 'sc-other': true },
      },
    };
    const { result } = renderHook(() =>
      useChatCostNote(AgentMap.Optimus, SERVICE_CONFIG_ID),
    );

    result.current.markCostNoteSeen();

    expect(mockStoreSet).toHaveBeenCalledWith('optimus.chatCostNoteSeen', {
      'sc-other': true,
      [SERVICE_CONFIG_ID]: true,
    });
  });
});
